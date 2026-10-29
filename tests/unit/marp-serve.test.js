const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");
const { once } = require("node:events");

const http = require("node:http");

const {
  isHttpPortConflict,
  isNotifierPortConflict,
} = require("../../src/preview-runtime");

const repoRoot = path.join(__dirname, "../..");
const serveScript = path.join(repoRoot, "scripts", "marp-serve.js");

// Both first attempts bind the same free port after a marker-file barrier,
// reproducing Marp's notifier race. A restarted stub asks the OS for a free
// port. Avoid connect-based probes: firewalls may silently drop connections
// to unused ports instead of rejecting them, leaving the test stuck.
const STUB_MARP_SOURCE = `#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const basePort = Number(process.env.STUB_BASE_PORT);
const syncDir = process.env.STUB_SYNC_DIR;
const expected = Number(process.env.STUB_EXPECTED || "2");

{
  const initial = fs.readdirSync(syncDir).length < expected;
  const port = initial ? basePort : 0;
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
}

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

    const reservation = net.createServer();
    reservation.listen(0);
    await once(reservation, "listening");
    const stubBasePort = reservation.address().port;
    await new Promise((resolve) => reservation.close(resolve));

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

    t.after(async () => {
      await Promise.all(
        procs.map(async ({ child }) => {
          if (child.exitCode === null && child.signalCode === null) {
            const exited = once(child, "exit");
            child.kill("SIGTERM");
            await exited;
          }
        }),
      );
      fs.rmSync(tmp, { recursive: true, force: true });
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

// Deterministic stub for the HTTP listen-port fallback. Each spawn appends its
// raw PORT to STUB_PORT_LOG (JSONL), and the attempt number (line count) picks
// the step from STUB_STEPS: "ready" serves HTTP 200 on an ephemeral port and
// announces its real URL; "http"/"ansi"/"real" fail like Marp's handled
// listen-port conflict on the logical PORT; "notifier" dies with the raw
// EADDRINUSE crash; "mixed" prints both; "generic" fails otherwise.
const STUB_HTTP_SOURCE = `#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const http = require("node:http");

const portLog = process.env.STUB_PORT_LOG;
const signalLog = process.env.STUB_SIGNAL_LOG;
const steps = (process.env.STUB_STEPS || "ready").split(",");
const hasPort = Object.prototype.hasOwnProperty.call(process.env, "PORT");
const httpPort = Number.parseInt(process.env.PORT, 10) || 8080;
fs.appendFileSync(
  portLog,
  JSON.stringify({ port: hasPort ? process.env.PORT : null, set: hasPort }) +
    "\\n",
);
const attempt = fs.readFileSync(portLog, "utf8").trim().split("\\n").length;
const step = steps[Math.min(attempt - 1, steps.length - 1)];

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (signalLog) fs.appendFileSync(signalLog, sig + " " + attempt + "\\n");
    process.exit(0);
  });
}

const conflictMessage = (port) =>
  "[ ERROR ] Listen port " +
  port +
  " is already used in the other process. Try again after closing the" +
  " relevant process, or specify another port number through PORT env.";

const NOTIFIER_CRASH = [
  "node:events:486",
  "      throw er; // Unhandled 'error' event",
  "      ^",
  "",
  "Error: listen EADDRINUSE: address already in use :::37717",
  "    at new WebSocketServer (ws/lib/websocket-server.js:106:20)",
].join("\\n");

if (step === "ready") {
  const srv = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  });
  srv.listen(0, "127.0.0.1", () => {
    console.log(
      "[  INFO ] [Server mode] Start server listened at http://localhost:" +
        srv.address().port +
        "/ ...",
    );
  });
} else if (step === "http" || step === "wrongport") {
  const reported =
    step === "wrongport" ? httpPort + 1 : httpPort;
  console.error(conflictMessage(reported));
  process.exit(3);
} else if (step === "ansi") {
  const p = String(httpPort);
  const chunks = [
    "\\x1b[31m[ ERROR ]\\x1b[0m Listen port \\x1b[1m" +
      p.slice(0, 2) +
      "\\x1b[0m" +
      p.slice(2) +
      " is already\\n",
    "          used in the other\\n",
    "          process. Try again after closing the relevant process, or\\n",
    "          specify another port number through PORT env.\\n",
  ];
  let i = 0;
  const writeNext = () => {
    if (i === chunks.length) {
      process.exit(3);
      return;
    }
    process.stderr.write(chunks[i++], () => setTimeout(writeNext, 5));
  };
  writeNext();
} else if (step === "real") {
  const blocker = http.createServer();
  blocker.listen(0, "127.0.0.1", () => {
    const second = http.createServer();
    second.once("error", (err) => {
      if (err.code !== "EADDRINUSE") {
        console.error("unexpected stub bind error: " + err.message);
        process.exit(4);
        return;
      }
      console.error(conflictMessage(httpPort));
      process.exit(3);
    });
    second.listen(blocker.address().port, "127.0.0.1");
  });
} else if (step === "notifier") {
  console.error(NOTIFIER_CRASH);
  process.exit(1);
} else if (step === "mixed") {
  console.error(conflictMessage(httpPort));
  console.error(NOTIFIER_CRASH);
  process.exit(3);
} else {
  console.error("[ ERROR ] stub step " + step + " failed");
  process.exit(3);
}
`;

function launchStubbedServe(t, { steps, port, args = [], deck }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "marp-serve-http-"));
  const stubPath = path.join(tmp, "marp-stub");
  fs.writeFileSync(stubPath, STUB_HTTP_SOURCE);
  fs.chmodSync(stubPath, 0o755);

  const deckDir = path.join(tmp, "deck");
  fs.mkdirSync(deckDir);
  const deckPath = deck || path.join(deckDir, "slide.md");
  if (!deck) {
    fs.writeFileSync(deckPath, "---\nmarp: true\n---\n# hi\n");
  }

  const portLog = path.join(tmp, "ports.jsonl");
  const signalLog = path.join(tmp, "signals.log");
  const env = {
    ...process.env,
    MARP_AGENT_NO_OPEN: "1",
    MARP_AGENT_BIND_ADDRESS: "127.0.0.1",
    MARP_AGENT_MARP_BIN: stubPath,
    STUB_PORT_LOG: portLog,
    STUB_SIGNAL_LOG: signalLog,
    STUB_STEPS: steps,
  };
  delete env.PORT;
  if (port !== undefined) env.PORT = port;

  const child = spawn(process.execPath, [serveScript, deckPath, ...args], {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const rec = { child, out: "" };
  rec.closed = new Promise((resolve) => {
    child.once("close", (code, signal) => resolve([code, signal]));
  });
  const onData = (buf) => {
    rec.out += buf.toString();
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  const readAttempts = () =>
    fs
      .readFileSync(portLog, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

  const waitOutput = (re, ms = 15000) =>
    new Promise((resolve) => {
      const deadline = Date.now() + ms;
      const poll = setInterval(() => {
        const match = rec.out.match(re);
        if (
          match ||
          child.exitCode !== null ||
          child.signalCode !== null ||
          Date.now() > deadline
        ) {
          clearInterval(poll);
          resolve(match);
        }
      }, 5);
    });

  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
    await rec.closed;
  };

  t.after(async () => {
    await stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  return { rec, portLog, signalLog, readAttempts, waitOutput, stop, tmp };
}

const httpStatus = (url) =>
  new Promise((resolve, reject) => {
    http
      .get(url, { timeout: 3000 }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      })
      .on("timeout", function () {
        this.destroy(new Error("request timeout"));
      })
      .on("error", reject);
  });

test(
  "implicit HTTP conflict advances to next candidate",
  { timeout: 30000 },
  async (t) => {
    // The first attempt hits a real post-launch EADDRINUSE, surfaced as Marp's
    // handled listen-port diagnostic for logical PORT 8080; the retry on 8081
    // succeeds on its own ephemeral socket.
    const { rec, readAttempts, waitOutput, stop } = launchStubbedServe(t, {
      steps: "real,ready",
    });

    const opened = await waitOutput(/\[preview\] Opened (\S+)/);
    assert.ok(
      opened,
      `expected an opened URL after the conflict, output: ${rec.out}`,
    );
    assert.match(rec.out, /trying 8081 \(2\/10\)/);
    assert.equal(await httpStatus(opened[1]), 200);
    await stop();
    assert.deepEqual(
      readAttempts().map((a) => a.port),
      ["8080", "8081"],
    );
  },
);

test("isHttpPortConflict matches the handled diagnostic for the attempted port", () => {
  const output =
    "[ ERROR ] Listen port 8080 is already used in the other process. " +
    "Try again after closing the relevant process, or specify another " +
    "port number through PORT env.";

  assert.equal(isHttpPortConflict(output, 8080), true);
  assert.equal(isHttpPortConflict(output, 8081), false);
  assert.equal(
    isHttpPortConflict(
      "Listen port 8081 is already used in the other process.",
      8080,
    ),
    false,
  );
});

test("isHttpPortConflict tolerates ANSI styling and forwarded wrapping", () => {
  const output = [
    "\x1b[31m[ ERROR ]\x1b[0m Listen port \x1b[1m80\x1b[0m80 is already",
    "          used in the other",
    "          process. Try again after closing the relevant process.",
  ].join("\n");

  assert.equal(isHttpPortConflict(output, 8080), true);
});

test("isHttpPortConflict rejects notifier, generic, and partial output", () => {
  assert.equal(
    isHttpPortConflict(
      "Error: listen EADDRINUSE: address already in use :::37717",
      8080,
    ),
    false,
  );
  assert.equal(
    isHttpPortConflict("[ ERROR ] conversion failed for deck", 8080),
    false,
  );
  assert.equal(
    isHttpPortConflict("Listen port 8080 is already used.", 8080),
    false,
  );
  assert.equal(
    isHttpPortConflict("[  INFO ] Start server listened", 8080),
    false,
  );
});

const serveExit = (rec) => rec.closed;

const attemptedPorts = (readAttempts) => readAttempts().map((a) => a.port);

test(
  "implicit free default port serves without fallback",
  { timeout: 30000 },
  async (t) => {
    const { rec, readAttempts, waitOutput, stop } = launchStubbedServe(t, {
      steps: "ready",
    });

    const opened = await waitOutput(/\[preview\] Opened (\S+)/);
    assert.ok(opened, `expected opened URL, output: ${rec.out}`);
    assert.doesNotMatch(rec.out, /trying 80/);
    assert.equal(await httpStatus(opened[1]), 200);
    await stop();
    assert.deepEqual(attemptedPorts(readAttempts), ["8080"]);
  },
);

test(
  "multiple implicit conflicts advance through candidates",
  { timeout: 30000 },
  async (t) => {
    // First diagnostic is ANSI-colored, line-wrapped, and chunked; the second
    // is plain. Both must advance the candidate.
    const { rec, readAttempts, waitOutput, stop } = launchStubbedServe(t, {
      steps: "ansi,http,ready",
    });

    const opened = await waitOutput(/\[preview\] Opened (\S+)/);
    assert.ok(opened, `expected opened URL, output: ${rec.out}`);
    assert.match(rec.out, /trying 8081 \(2\/10\)/);
    assert.match(rec.out, /trying 8082 \(3\/10\)/);
    assert.equal(await httpStatus(opened[1]), 200);
    await stop();
    assert.deepEqual(attemptedPorts(readAttempts), ["8080", "8081", "8082"]);
  },
);

test(
  "explicit PORT conflict exits with original status and no fallback",
  { timeout: 30000 },
  async (t) => {
    const { rec, readAttempts, waitOutput } = launchStubbedServe(t, {
      steps: "http",
      port: "8093",
    });

    await waitOutput(/already used in the other process/);
    const [code] = await serveExit(rec);
    assert.equal(code, 3);
    assert.doesNotMatch(rec.out, /trying 80/);
    assert.deepEqual(attemptedPorts(readAttempts), ["8093"]);
  },
);

test(
  "explicit empty and invalid PORT reach the child untouched",
  { timeout: 30000 },
  async (t) => {
    for (const port of ["", "abc"]) {
      const { rec, readAttempts, waitOutput } = launchStubbedServe(t, {
        steps: "http",
        port,
      });

      await waitOutput(/already used in the other process/);
      const [code] = await serveExit(rec);
      assert.equal(code, 3, `PORT=${JSON.stringify(port)}`);
      assert.doesNotMatch(rec.out, /trying 80/);
      assert.deepEqual(
        readAttempts(),
        [{ port, set: true }],
        `PORT=${JSON.stringify(port)}`,
      );
    }
  },
);

test(
  "implicit fallback exhausts candidates with the original exit status",
  { timeout: 30000 },
  async (t) => {
    const steps = `${"http,".repeat(9)}mixed`;
    const { rec, readAttempts, waitOutput } = launchStubbedServe(t, {
      steps,
    });

    await waitOutput(/already used in the other process/);
    const [code] = await serveExit(rec);
    assert.equal(code, 3);
    assert.match(rec.out, /HTTP ports 8080-8089 are all in use/);
    assert.match(rec.out, /10 attempts/);
    // The final mixed diagnostic must not fall through to a notifier retry.
    assert.doesNotMatch(rec.out, /port conflict; restarting/);
    assert.deepEqual(
      attemptedPorts(readAttempts),
      Array.from({ length: 10 }, (_, i) => String(8080 + i)),
    );
  },
);

test(
  "generic and wrong-port failures do not advance the candidate",
  { timeout: 30000 },
  async (t) => {
    for (const steps of ["generic", "wrongport"]) {
      const { rec, readAttempts, waitOutput } = launchStubbedServe(t, {
        steps,
      });

      await waitOutput(/stub step|already used/);
      const [code] = await serveExit(rec);
      assert.equal(code, 3, `steps=${steps}`);
      assert.doesNotMatch(rec.out, /trying 80/);
      assert.deepEqual(attemptedPorts(readAttempts), ["8080"]);
    }
  },
);

test(
  "notifier retries keep the HTTP candidate and share a global budget",
  { timeout: 30000 },
  async (t) => {
    const { rec, readAttempts, waitOutput, stop } = launchStubbedServe(t, {
      steps: "notifier,http,notifier,ready",
    });

    const opened = await waitOutput(/\[preview\] Opened (\S+)/);
    assert.ok(opened, `expected opened URL, output: ${rec.out}`);
    await stop();
    assert.deepEqual(attemptedPorts(readAttempts), [
      "8080",
      "8080",
      "8081",
      "8081",
    ]);
  },
);

test(
  "notifier budget stays global across an HTTP candidate change",
  { timeout: 30000 },
  async (t) => {
    const steps = `${"notifier,".repeat(5)}http,notifier`;
    const { rec, readAttempts, waitOutput } = launchStubbedServe(t, {
      steps,
    });

    await waitOutput(/EADDRINUSE/);
    const [code] = await serveExit(rec);
    // Attempt 7 hits the notifier crash after five retries were spent; the
    // wrapper must propagate its status instead of respawning again.
    assert.equal(code, 1);
    assert.deepEqual(attemptedPorts(readAttempts), [
      ...Array(6).fill("8080"),
      "8081",
    ]);
  },
);

test(
  "mixed diagnostics prefer HTTP advance only for implicit PORT",
  { timeout: 30000 },
  async (t) => {
    const implicit = launchStubbedServe(t, { steps: "mixed,ready" });
    const opened = await implicit.waitOutput(/\[preview\] Opened (\S+)/);
    assert.ok(opened, `expected opened URL, output: ${implicit.rec.out}`);
    assert.match(implicit.rec.out, /trying 8081 \(2\/10\)/);
    assert.doesNotMatch(implicit.rec.out, /port conflict; restarting/);
    await implicit.stop();
    assert.deepEqual(attemptedPorts(implicit.readAttempts), ["8080", "8081"]);

    const explicit = launchStubbedServe(t, {
      steps: "mixed,ready",
      port: "8095",
    });
    const openedExplicit = await explicit.waitOutput(
      /\[preview\] Opened (\S+)/,
    );
    assert.ok(
      openedExplicit,
      `expected opened URL, output: ${explicit.rec.out}`,
    );
    assert.match(explicit.rec.out, /port conflict; restarting/);
    assert.doesNotMatch(explicit.rec.out, /trying 80/);
    await explicit.stop();
    assert.deepEqual(attemptedPorts(explicit.readAttempts), ["8095", "8095"]);
  },
);

test(
  "opened URL keeps the rendered-slide hash after fallback",
  { timeout: 30000 },
  async (t) => {
    const { rec, waitOutput, stop } = launchStubbedServe(t, {
      steps: "http,ready",
      args: ["2"],
      deck: path.join(repoRoot, "fixtures", "paginate-skip-slide.md"),
    });

    const opened = await waitOutput(/\[preview\] Opened (\S+)/);
    assert.ok(opened, `expected opened URL, output: ${rec.out}`);
    // Displayed page 2 is the third rendered slide of this fixture.
    assert.match(opened[1], /paginate-skip-slide\.md#3$/);
    assert.equal(await httpStatus(opened[1]), 200);
    await stop();
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  test(
    `${signal} reaches the current child after fallback`,
    { timeout: 30000 },
    async (t) => {
      const { rec, signalLog, readAttempts, waitOutput } = launchStubbedServe(
        t,
        { steps: "http,ready" },
      );

      const opened = await waitOutput(/\[preview\] Opened (\S+)/);
      assert.ok(opened, `expected opened URL, output: ${rec.out}`);
      rec.child.kill(signal);
      const [code] = await serveExit(rec);
      assert.equal(code, 0);
      assert.equal(fs.readFileSync(signalLog, "utf8").trim(), `${signal} 2`);
      assert.deepEqual(attemptedPorts(readAttempts), ["8080", "8081"]);
    },
  );

  test(
    `${signal} during the notifier retry delay exits without respawn`,
    { timeout: 30000 },
    async (t) => {
      const { rec, readAttempts, waitOutput } = launchStubbedServe(t, {
        steps: "notifier",
      });

      const restarting = await waitOutput(/port conflict; restarting/);
      assert.ok(restarting, `expected a retry notice, output: ${rec.out}`);
      rec.child.kill(signal);
      const [code] = await serveExit(rec);
      assert.equal(code, signal === "SIGINT" ? 130 : 143);
      assert.deepEqual(attemptedPorts(readAttempts), ["8080"]);
    },
  );
}
