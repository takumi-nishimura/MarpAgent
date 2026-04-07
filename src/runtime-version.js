const fs = require("node:fs");
const path = require("node:path");

const packageJsonPath = path.resolve(__dirname, "..", "package.json");

function parseNodeMajor(version) {
  const normalized = String(version || "").trim().replace(/^v/i, "");
  if (!/^\d+/.test(normalized)) {
    return undefined;
  }
  return Number(normalized.split(".")[0]);
}

function getRuntimePolicy() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const configuredVersion = packageJson?.volta?.node;

  if (!configuredVersion) {
    throw new Error("Missing package.json volta.node runtime policy.");
  }

  const requiredMajor = parseNodeMajor(configuredVersion);
  if (!Number.isInteger(requiredMajor) || requiredMajor < 1) {
    throw new Error(`Invalid package.json volta.node value: ${configuredVersion}`);
  }

  return {
    requiredMajor,
    configuredVersion,
  };
}

function assertSupportedNodeRuntime({
  currentVersion = process.versions.node,
  env = process.env,
} = {}) {
  if (env.MARP_AGENT_SKIP_RUNTIME_VERSION_CHECK === "1") {
    return;
  }

  const policy = getRuntimePolicy();
  const currentMajor = parseNodeMajor(currentVersion);

  if (currentMajor === policy.requiredMajor) {
    return;
  }

  const actual = String(currentVersion || "unknown");
  throw new Error(
    `Unsupported Node.js runtime ${actual}. Required major is ${policy.requiredMajor}.x (volta.node=${policy.configuredVersion}).`,
  );
}

function enforceSupportedNodeRuntime() {
  try {
    assertSupportedNodeRuntime();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  assertSupportedNodeRuntime,
  enforceSupportedNodeRuntime,
  getRuntimePolicy,
  parseNodeMajor,
};
