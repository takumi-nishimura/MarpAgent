const test = require("node:test");
const assert = require("node:assert/strict");
const packageJson = require("../../package.json");

test("package exposes a repo-local marpx npm script", () => {
  assert.equal(packageJson.bin.marpx, "bin/marpx.js");
  assert.equal(packageJson.scripts.marpx, "node bin/marpx.js");
});
