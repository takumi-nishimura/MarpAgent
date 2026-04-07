const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

function runNodeScript(scriptPath, args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("validate-deck fails when --report-dir value is missing", () => {
  const result = runNodeScript("scripts/validate-deck.js", [
    "fixtures/clean-slide.md",
    "--report-dir",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Option --report-dir requires a directory path\./);
});

test("generate-outline fails when --output value is missing", () => {
  const result = runNodeScript("scripts/generate-outline.js", [
    "fixtures/good-brief.md",
    "--output",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Option --output requires a file path\./);
});
