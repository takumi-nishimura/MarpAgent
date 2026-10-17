const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  killProcessGroup,
  listProcessGroupMembers,
  runProcess,
  waitForProcessGroupExit,
} = require("../helpers/process-group");

test("process inspection fails explicitly when ps is unavailable", () => {
  assert.throws(
    () =>
      listProcessGroupMembers(process.pid, {
        ps: "/missing/marpagent-test-ps",
      }),
    /Cannot inspect process group.*ENOENT/,
  );
});

for (const detached of [false, true])
  test(
    `a timed-out command kills its hanging child and grandchild (detached: ${detached})`,
    {
      skip:
        process.platform === "win32"
          ? "POSIX process groups are required."
          : false,
      timeout: 5000,
    },
    async () => {
      const root = fs.mkdtempSync(
        path.join(os.tmpdir(), "marpx-process-timeout-"),
      );
      const pidFile = path.join(root, "pids.json");
      const script = [
        "const { spawn } = require('node:child_process');",
        "process.on('SIGTERM', () => {});",
        `const child = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);"], { stdio: 'inherit', detached: ${detached} });`,
        "require('node:fs').writeFileSync(process.argv[1], JSON.stringify([process.pid, child.pid]));",
        "process.stdout.write('hanging parent and descendant\\n');",
        "setInterval(() => {}, 1000);",
      ].join("\n");
      let limit;
      try {
        const result = await Promise.race([
          runProcess(process.execPath, ["-e", script, pidFile], {
            timeoutMs: 500,
            killGraceMs: 100,
          }),
          new Promise((_, reject) => {
            limit = setTimeout(
              () => reject(new Error("Command did not obey its timeout.")),
              2500,
            );
          }),
        ]);
        assert.equal(result.error?.code, "ETIMEDOUT");
        assert.match(result.stderr, /timed out after 500 ms/);
        assert.match(result.stdout, /hanging parent and descendant/);
        const [pgid, descendant] = JSON.parse(fs.readFileSync(pidFile, "utf8"));
        assert.ok(descendant > 0);
        assert.deepEqual(await waitForProcessGroupExit(pgid, 1000), []);
        if (detached)
          assert.deepEqual(await waitForProcessGroupExit(descendant, 1000), []);
      } finally {
        clearTimeout(limit);
        if (fs.existsSync(pidFile)) {
          const [pgid, descendant] = JSON.parse(
            fs.readFileSync(pidFile, "utf8"),
          );
          if (detached) killProcessGroup(descendant);
          killProcessGroup(pgid);
        }
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );

test("a successful command retains stdout, stderr, and exit status", async () => {
  const result = await runProcess(
    process.execPath,
    [
      "-e",
      "console.log('output'); console.error('diagnostic'); process.exitCode = 7;",
    ],
    { timeoutMs: 2000 },
  );
  assert.equal(result.status, 7);
  assert.equal(result.error, undefined);
  assert.equal(result.stdout, "output\n");
  assert.equal(result.stderr, "diagnostic\n");
});

test("a timed-out command cannot pass by exiting zero after SIGTERM", async () => {
  const result = await runProcess(
    process.execPath,
    [
      "-e",
      "process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1000);",
    ],
    { timeoutMs: 200, killGraceMs: 50 },
  );
  assert.equal(result.error?.code, "ETIMEDOUT");
  assert.notEqual(result.status, 0);
});
