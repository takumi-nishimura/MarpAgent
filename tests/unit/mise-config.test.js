const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../..");

test("mise config exposes the repo-local marpx wrapper on PATH", () => {
  const miseConfig = fs.readFileSync(path.join(repoRoot, ".mise.toml"), "utf8");
  const wrapperStat = fs.statSync(path.join(repoRoot, "marpx"));

  assert.match(miseConfig, /^_\s*\.path\s*=\s*\[\s*"{{config_root}}"\s*\]/m);
  assert.equal(wrapperStat.isFile(), true);
  assert.notEqual(wrapperStat.mode & 0o111, 0);
});
