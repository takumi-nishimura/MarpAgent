const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

test("doctor reports checks in json format", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/doctor.js", "--format", "json"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(Array.isArray(payload.checks), true);
  assert.equal(payload.checks.length > 0, true);
  assert.equal(
    payload.checks.some((check) => check.name === "node-runtime"),
    true,
  );
});
