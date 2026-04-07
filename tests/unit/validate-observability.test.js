const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

function runValidateWithEnv(extraEnv) {
  return spawnSync(
    process.execPath,
    ["scripts/validate-deck.js", "fixtures/clean-slide.md"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...extraEnv,
      },
    },
  );
}

test("validate-deck emits structured warning logs on visual-check fallback", () => {
  const result = runValidateWithEnv({
    MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE: "1",
  });

  assert.equal(result.status, 0);
  assert.match(result.stderr, /"event":"visual-check-failed"/);
  assert.match(result.stderr, /"event":"heuristic-fallback"/);
  assert.equal(result.stderr.includes('"event":"visual-check-stack"'), false);
});

test("validate-deck emits structured debug stack log when debug mode is enabled", () => {
  const result = runValidateWithEnv({
    MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE: "1",
    MARP_AGENT_DEBUG: "1",
  });

  assert.equal(result.status, 0);
  assert.match(result.stderr, /"event":"visual-check-stack"/);
});
