const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");

test("conversion timeout rejects zero, negative, fractional, and nonnumeric values", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-invalid-timeout-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const value of ["0", "-1", "1.5", "bad", "Infinity", "2147483648"]) {
    const result = spawnSync(
      process.execPath,
      [
        "bin/marpx.js",
        "fixtures/clean-slide.md",
        "--html",
        "-o",
        path.join(root, "out.html"),
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 5000,
        env: { ...process.env, MARP_AGENT_CONVERT_TIMEOUT_MS: value },
      },
    );
    assert.equal(result.status, 1, value);
    assert.match(
      result.stderr,
      /MARP_AGENT_CONVERT_TIMEOUT_MS.*positive integer/,
    );
  }
});

test("validate and screenshot bound a stalled HTML conversion and remove temporary output", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-render-timeout-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const stub = path.join(root, "stall.cjs");
  fs.writeFileSync(
    stub,
    `#!/usr/bin/env node\nsetInterval(() => {}, 1000);\n`,
    { mode: 0o755 },
  );
  for (const args of [
    ["-v", "--strict"],
    ["--screenshot", "1"],
  ]) {
    const result = spawnSync(
      process.execPath,
      ["bin/marpx.js", "fixtures/clean-slide.md", ...args],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 6000,
        env: {
          ...process.env,
          TMPDIR: root,
          MARP_AGENT_MARP_BIN: stub,
          MARP_AGENT_CONVERT_TIMEOUT_MS: "100",
        },
      },
    );
    assert.equal(result.error, undefined, result.error?.message);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stdout + result.stderr,
      /did not finish within.*100\s*ms/i,
    );
    assert.deepEqual(fs.readdirSync(root), ["stall.cjs"]);
  }
});

test(
  "a timed-out export stops its detached browser descendant",
  { skip: process.platform === "win32" },
  (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-tree-timeout-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const stub = path.join(root, "stall.cjs");
    const pidFile = path.join(root, "browser.pid");
    fs.writeFileSync(
      stub,
      `#!/usr/bin/env node
    const child = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: true, stdio: 'ignore' });
    require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
    setInterval(() => {}, 1000);
  `,
      { mode: 0o755 },
    );
    const result = spawnSync(
      process.execPath,
      ["bin/marpx.js", "fixtures/clean-slide.md", "--html"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 5000,
        env: {
          ...process.env,
          MARP_AGENT_MARP_BIN: stub,
          MARP_AGENT_CONVERT_TIMEOUT_MS: "500",
        },
      },
    );
    assert.equal(result.status, 1, result.stderr);
    const pid = Number(fs.readFileSync(pidFile, "utf8"));
    t.after(() => {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    });
    const ps = spawnSync("ps", ["-o", "stat=", "-p", String(pid)], {
      encoding: "utf8",
    });
    assert.equal(ps.error, undefined, ps.error?.message);
    assert.ok(
      [0, 1].includes(ps.status),
      `process inspection failed: ${ps.stderr}`,
    );
    assert.equal(ps.stderr.trim(), "", "process inspection must not emit errors");
    assert.ok(
      ps.status === 1 || /^Z/.test(ps.stdout.trim()),
      `descendant ${pid} still runs: ${ps.stdout}`,
    );
  },
);

test("screenshot kills its browser when a page operation stalls", async () => {
  const { screenshotSlide } = require("../../src/visual-overflow");
  let killed = false;
  const browserServer = {
    wsEndpoint: () => "ws://test",
    kill: async () => {
      killed = true;
    },
  };
  const chromium = {
    launchServer: async () => browserServer,
    connect: async () => ({
      newPage: async () => new Promise(() => {}),
      close: async () => {},
    }),
  };
  await assert.rejects(
    screenshotSlide("/tmp/never.html", "1", { timeoutMs: 20, chromium }),
    /did not finish within.*20\s*ms/,
  );
  assert.equal(killed, true);
});
