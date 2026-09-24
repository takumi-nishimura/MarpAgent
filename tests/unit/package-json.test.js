const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const packageJson = require("../../package.json");

function marpCliCoreVersion() {
  const cliPkgPath = require.resolve("@marp-team/marp-cli/package.json");
  const corePkgPath = require.resolve("@marp-team/marp-core/package.json", {
    paths: [path.dirname(cliPkgPath)],
  });
  return require(corePkgPath).version;
}

test("package exposes a repo-local marpx npm script", () => {
  assert.equal(packageJson.bin.marpx, "bin/marpx.js");
  assert.equal(packageJson.scripts.marpx, "node bin/marpx.js");
});

test("declares @marp-team/marp-core at the version marp-cli resolves", () => {
  const declared = packageJson.dependencies["@marp-team/marp-core"];
  assert.equal(declared, marpCliCoreVersion());
});

test("in-process marp-core matches the version marp-cli resolves", () => {
  const inProcess = require("@marp-team/marp-core/package.json").version;
  assert.equal(inProcess, marpCliCoreVersion());
});
