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

test("runtime policy separates the LTS selector from the minimum supported major", () => {
  const policy = getRuntimePolicy();
  assert.equal(policy.minimumMajor, 26);
  assert.equal(policy.configuredVersion, "lts");
});

test("assertSupportedNodeRuntime accepts matching major", () => {
  const policy = getRuntimePolicy();
  assert.doesNotThrow(() => {
    assertSupportedNodeRuntime({
      currentVersion: `${policy.minimumMajor}.0.0`,
      env: {},
    });
  });
});

test("assertSupportedNodeRuntime rejects the previous EOL runtime", () => {
  assert.throws(
    () =>
      assertSupportedNodeRuntime({
        currentVersion: "25.6.0",
        env: {},
      }),
    /Requires Node.js >=26/,
  );
});

test("assertSupportedNodeRuntime can be skipped via env flag", () => {
  assert.doesNotThrow(() => {
    assertSupportedNodeRuntime({
      currentVersion: "25.6.0",
      env: { MARP_AGENT_SKIP_RUNTIME_VERSION_CHECK: "1" },
    });
  });
});

test("future majors do not require editing the floating LTS selector", () => {
  assert.doesNotThrow(() =>
    assertSupportedNodeRuntime({ currentVersion: "28.0.0", env: {} }),
  );
});

test("invalid runtime versions are rejected", () => {
  assert.throws(
    () => assertSupportedNodeRuntime({ currentVersion: "unknown", env: {} }),
    /Unsupported Node.js runtime/,
  );
});
