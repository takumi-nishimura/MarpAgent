const test = require("node:test");
const assert = require("node:assert/strict");
const packageJson = require("../../package.json");
const { Marp } = require("@marp-team/marp-core/full");
const config = require("../../marp.config");

test("package exposes a repo-local marpx npm script", () => {
  assert.equal(packageJson.bin.marpx, "bin/marpx.js");
  assert.equal(packageJson.scripts.marpx, "node bin/marpx.js");
});

test("pins the installed @marp-team/marp-core version", () => {
  const declared = packageJson.dependencies["@marp-team/marp-core"];
  assert.equal(declared, require("@marp-team/marp-core/package.json").version);
});

test("configured CLI engine uses installed full Core even with another default", () => {
  const engine = config.engine({ marp: {}, html: true });
  assert.ok(engine instanceof Marp);
  assert.equal(engine.options.html, true);
});
