const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");

test("export and serve diagnose a missing Marp binary without an unhandled error", (t) => {
  for (const args of [["--html"], ["--pdf"], []]) {
    const result = spawnSync(
      process.execPath,
      ["bin/marpx.js", "fixtures/clean-slide.md", ...args],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...process.env,
          MARP_AGENT_MARP_BIN: "/missing/marp-for-regression",
          MARP_AGENT_NO_OPEN: "1",
        },
      },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /\/missing\/marp-for-regression/);
    assert.doesNotMatch(result.stderr, /Unhandled 'error'|node:events/);
  }
});

test("runScript handles a spawn error before exit can be emitted", (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-spawn-error-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const preload = path.join(tmp, "preload.cjs");
  fs.writeFileSync(
    preload,
    `
    const { EventEmitter } = require('node:events');
    require('node:child_process').spawn = () => {
      const child = new EventEmitter();
      process.nextTick(() => child.emit('error', Object.assign(new Error('injected ENOENT'), {code: 'ENOENT'})));
      return child;
    };
  `,
  );
  const result = spawnSync(
    process.execPath,
    ["--require", preload, "bin/marpx.js", "--doctor"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 10000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /doctor\.js.*ENOENT/);
  assert.doesNotMatch(result.stderr, /Unhandled 'error'|node:events/);
});
