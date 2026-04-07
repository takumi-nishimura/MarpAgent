const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

function runValidateWithEnv(extraEnv) {
  return runValidate([], extraEnv);
}

function runValidate(extraArgs, extraEnv) {
  return spawnSync(
    process.execPath,
    ["scripts/validate-deck.js", "fixtures/clean-slide.md", ...extraArgs],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        MARP_AGENT_REQUIRE_VISUAL: "0",
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

test("validate-deck fails fast in strict visual mode", () => {
  const result = runValidate(
    ["--strict-visual"],
    {
      MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE: "1",
    },
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /"event":"strict-visual-failed"/);
  assert.match(result.stderr, /Visual check failed in strict mode/);
});
