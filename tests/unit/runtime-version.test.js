const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assertSupportedNodeRuntime,
  getRuntimePolicy,
  parseNodeMajor,
} = require("../../src/runtime-version");

test("parseNodeMajor extracts major from semver values", () => {
  assert.equal(parseNodeMajor("25.6.0"), 25);
  assert.equal(parseNodeMajor("v25.6.0"), 25);
  assert.equal(parseNodeMajor("not-a-version"), undefined);
});

test("getRuntimePolicy loads required major from package volta.node", () => {
  const policy = getRuntimePolicy();
  assert.equal(typeof policy.requiredMajor, "number");
  assert.match(policy.configuredVersion, /^\d+\.\d+\.\d+$/);
});

test("assertSupportedNodeRuntime accepts matching major", () => {
  const policy = getRuntimePolicy();
  assert.doesNotThrow(() => {
    assertSupportedNodeRuntime({
      currentVersion: `${policy.requiredMajor}.0.0`,
      env: {},
    });
  });
});

test("assertSupportedNodeRuntime rejects non-matching major", () => {
  const policy = getRuntimePolicy();
  const mismatchedMajor = policy.requiredMajor + 1;

  assert.throws(
    () =>
      assertSupportedNodeRuntime({
        currentVersion: `${mismatchedMajor}.0.0`,
        env: {},
      }),
    new RegExp(`Required major is ${policy.requiredMajor}`),
  );
});

test("assertSupportedNodeRuntime can be skipped via env flag", () => {
  const policy = getRuntimePolicy();
  const mismatchedMajor = policy.requiredMajor + 1;

  assert.doesNotThrow(() => {
    assertSupportedNodeRuntime({
      currentVersion: `${mismatchedMajor}.0.0`,
      env: { MARP_AGENT_SKIP_RUNTIME_VERSION_CHECK: "1" },
    });
  });
});
