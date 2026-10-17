const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createThemeRepo } = require("./helpers/theme-repo");
const { runProcess } = require("../helpers/process-group");

function createCompilerRepo(t, compiler) {
  const root = createThemeRepo({
    paths: ["bin", "src", ".mise.toml"],
    linkDependencies: false,
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "themes/src"), { recursive: true });
  fs.writeFileSync(path.join(root, "themes/src/test.css"), "/* @theme test */");
  if (compiler) {
    fs.mkdirSync(path.join(root, "node_modules/.bin"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "node_modules/.bin/tailwindcss"),
      `#!${process.execPath}\n${compiler}`,
      { mode: 0o755 },
    );
  }
  return root;
}

for (const watch of [false, true]) {
  const label = watch ? "watch" : "build";
  test(`theme ${label} reports a missing compiler without an unhandled error`, async (t) => {
    const root = createCompilerRepo(t);
    const result = await runProcess(
      process.execPath,
      [
        path.join(root, "bin/marpx.js"),
        "--theme",
        "test",
        ...(watch ? ["--watch"] : []),
      ],
      { cwd: root, timeoutMs: 2000 },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(
      result.stderr,
      /Error: failed to start theme compiler.*ENOENT/,
    );
    assert.doesNotMatch(result.stderr, /Unhandled 'error' event|node:events/);
  });
  test(`theme ${label} preserves a compiler signal as failure`, async (t) => {
    const root = createCompilerRepo(t, "process.kill(process.pid, 'SIGTERM');");
    const result = await runProcess(
      process.execPath,
      [
        path.join(root, "bin/marpx.js"),
        "--theme",
        "test",
        ...(watch ? ["--watch"] : []),
      ],
      { cwd: root, timeoutMs: 2000 },
    );
    assert.equal(result.status, 143, result.stderr);
  });
  test(`theme ${label} forwards a parent SIGTERM to its compiler`, async (t) => {
    const root = createCompilerRepo(
      t,
      [
        "process.on('SIGTERM', () => { console.log('compiler received SIGTERM'); process.exit(0); });",
        "setInterval(() => {}, 1000);",
        "process.kill(process.ppid, 'SIGTERM');",
      ].join("\n"),
    );
    const result = await runProcess(
      process.execPath,
      [
        path.join(root, "bin/marpx.js"),
        "--theme",
        "test",
        ...(watch ? ["--watch"] : []),
      ],
      { cwd: root, timeoutMs: 2000 },
    );
    assert.equal(result.status, 143, result.stderr);
    assert.equal(result.error, undefined);
    assert.match(result.stdout, /compiler received SIGTERM/);
  });
}
