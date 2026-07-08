const fs = require("node:fs");
const path = require("node:path");

const miseConfigPath = path.resolve(__dirname, "..", ".mise.toml");

function parseNodeMajor(version) {
  const normalized = String(version || "").trim().replace(/^v/i, "");
  if (!/^\d+/.test(normalized)) {
    return undefined;
  }
  return Number(normalized.split(".")[0]);
}

function getRuntimePolicy() {
  const miseConfig = fs.readFileSync(miseConfigPath, "utf8");
  const nodeMatch = miseConfig.match(/^\s*node\s*=\s*["']([^"']+)["']\s*$/m);
  const configuredVersion = nodeMatch?.[1];

  if (!configuredVersion) {
    throw new Error("Missing .mise.toml tools.node runtime policy.");
  }

  const requiredMajor = parseNodeMajor(configuredVersion);
  if (!Number.isInteger(requiredMajor) || requiredMajor < 1) {
    throw new Error(`Invalid .mise.toml tools.node value: ${configuredVersion}`);
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
    `Unsupported Node.js runtime ${actual}. Required major is ${policy.requiredMajor}.x (.mise.toml node=${policy.configuredVersion}).`,
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
