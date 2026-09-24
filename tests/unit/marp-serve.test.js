const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { isNotifierPortConflict } = require("../../src/preview-runtime");

const repoRoot = path.join(__dirname, "../..");
const serveScript = path.join(repoRoot, "scripts", "marp-serve.js");

// Stub marp binary: like marp-cli's watch notifier it probes a free port and
// binds it later, so processes started together race and the loser exits with
// the same unhandled EADDRINUSE crash. The probe is a connect check (no bind),
// so concurrent stubs always pick the same candidate port, and a marker-file
// barrier makes both probe before either binds: the collision is certain.
const STUB_MARP_SOURCE = `#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const basePort = Number(process.env.STUB_BASE_PORT);
const syncDir = process.env.STUB_SYNC_DIR;
const expected = Number(process.env.STUB_EXPECTED || "2");

function probe(port, cb) {
  const s = net.connect({ port, host: "127.0.0.1" });
  s.once("connect", () => {
    s.destroy();
    probe(port + 1, cb);
  });
  s.once("error", () => cb(port));
}

probe(basePort, (port) => {
  fs.writeFileSync(path.join(syncDir, "probe-" + process.pid), "");
  const started = Date.now();
  const wait = setInterval(() => {
    const peers = fs
      .readdirSync(syncDir)
      .filter((f) => f.startsWith("probe-")).length;
    if (peers < expected && Date.now() - started < 1500) return;
    clearInterval(wait);
    const srv = net.createServer();
    srv.once("error", () => {
      console.error("node:events:486");
      console.error("      throw er; // Unhandled 'error' event");
      console.error("      ^");
      console.error("");
      console.error(
        "Error: listen EADDRINUSE: address already in use :::" + port,
      );
      console.error(
        "    at new WebSocketServer (ws/lib/websocket-server.js:106:20)",
      );
      process.exit(1);
    });
    srv.once("listening", () => {
      console.log(
        "[  INFO ] [Server mode] Start server listened at http://localhost:" +
          (process.env.PORT || 8080) +
          "/ ...",
      );
    });
    srv.listen(port);
  }, 5);
});

setInterval(() => {}, 60000);
`;

test("isNotifierPortConflict detects the unhandled notifier EADDRINUSE", () => {
  const crash = [
    "node:events:486",
    "      throw er; // Unhandled 'error' event",
    "      ^",
    "",
    "Error: listen EADDRINUSE: address already in use :::37717",
    "    at new WebSocketServer (ws/lib/websocket-server.js:106:20)",
    "    at vl.start (marp-cli/lib/marp-cli.js:48:141441)",
  ].join("\n");

  assert.equal(isNotifierPortConflict(crash), true);
});

test("isNotifierPortConflict ignores the handled listen-port failure", () => {
  const output =
    "[ERROR] Listen port 8080 is already used in the other process. " +
    "Try again after closing the relevant process, or specify another port " +
    "number through PORT env.";

  assert.equal(isNotifierPortConflict(output), false);
});

test("isNotifierPortConflict still retries when both failures appear", () => {
  // A process can lose the serve listen port and then also die from the
  // notifier crash; the retry either recovers or re-exits with the handled
  // listen-port error, so it must not be suppressed.
  const output = [
    "[ERROR] Listen port 8080 is already used in the other process.",
    "Error: listen EADDRINUSE: address already in use :::37717",
  ].join("\n");

  assert.equal(isNotifierPortConflict(output), true);
});

test("isNotifierPortConflict returns false for clean output", () => {
  assert.equal(
    isNotifierPortConflict(
      "[  INFO ] [Server mode] Start server listened at http://localhost:8080/",
    ),
    false,
  );
});

test(
  "two concurrent serve processes survive the watch-notifier port race",
  { timeout: 30000 },
  async (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "marp-serve-race-"));
    const syncDir = path.join(tmp, "sync");
    fs.mkdirSync(syncDir);

    const stubPath = path.join(tmp, "marp-stub");
    fs.writeFileSync(stubPath, STUB_MARP_SOURCE);
    fs.chmodSync(stubPath, 0o755);

    const stubBasePort = 24000 + (process.pid % 2000) * 4;

    const procs = [0, 1].map((i) => {
      const deckDir = path.join(tmp, `deck-${i}`);
      fs.mkdirSync(deckDir);
      fs.writeFileSync(
        path.join(deckDir, "slide.md"),
        "---\nmarp: true\n---\n# hi\n",
      );

      const child = spawn(
        process.execPath,
        [serveScript, path.join(deckDir, "slide.md")],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            MARP_AGENT_NO_OPEN: "1",
            MARP_AGENT_MARP_BIN: stubPath,
            PORT: String(27000 + (process.pid % 2000) * 2 + i),
            STUB_BASE_PORT: String(stubBasePort),
            STUB_SYNC_DIR: syncDir,
            STUB_EXPECTED: "2",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      const proc = { child, out: "", ready: false };
      const onData = (buf) => {
        proc.out += buf.toString();
        if (/Start server listened/.test(proc.out)) proc.ready = true;
      };
      child.stdout.on("data", onData);
      child.stderr.on("data", onData);
      return proc;
    });

    t.after(() => {
      for (const { child } of procs) {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGTERM");
        }
      }
    });

    const deadline = Date.now() + 20000;
    await new Promise((resolve) => {
      const poll = setInterval(() => {
        const settled = procs.every(
          (p) => p.ready || p.child.exitCode !== null,
        );
        if (settled || Date.now() > deadline) {
          clearInterval(poll);
          // Let a late retry message flush before asserting.
          setTimeout(resolve, 500);
        }
      }, 50);
    });

    for (const p of procs) {
      assert.ok(
        p.ready,
        `serve process should reach ready state, output: ${p.out}`,
      );
    }

    // The barrier makes exactly one process lose the first bind, so the retry
    // path must have been exercised.
    assert.ok(
      procs.some((p) => /port conflict; restarting/.test(p.out)),
      `expected a notifier retry, outputs: ${procs.map((p) => p.out).join(" | ")}`,
    );
  },
);
