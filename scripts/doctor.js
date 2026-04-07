const fs = require("node:fs");
const path = require("node:path");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = [...argv];
  let format = "text";
  const usage = "Usage: npx marpx --doctor [--format text|json]";

  const fail = (message) => {
    console.error(usage);
    console.error(message);
    process.exit(1);
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--format") {
      const value = args.shift();
      if (!value || value.startsWith("--")) {
        fail("Option --format requires one of: text, json.");
      }
      if (!["text", "json"].includes(value)) {
        fail(`Unsupported --format value: ${value}`);
      }
      format = value;
      continue;
    }
    fail(`Unknown option: ${arg}`);
  }

  return { format };
}

async function checkNodeRuntime() {
  const {
    assertSupportedNodeRuntime,
    getRuntimePolicy,
  } = require("../src/runtime-version");
  const policy = getRuntimePolicy();

  assertSupportedNodeRuntime();
  return {
    name: "node-runtime",
    status: "pass",
    detail: `Node ${process.versions.node} matches volta.node ${policy.configuredVersion}.`,
  };
}

async function checkMarpBinary() {
  const binaryName = process.platform === "win32" ? "marp.cmd" : "marp";
  const marpPath = path.join(repoRoot, "node_modules", ".bin", binaryName);
  if (!fs.existsSync(marpPath)) {
    throw new Error(`Marp CLI binary not found: ${marpPath}`);
  }
  return {
    name: "marp-cli",
    status: "pass",
    detail: `Found ${marpPath}.`,
  };
}

async function checkThemes() {
  const themesDir = path.join(repoRoot, "themes");
  const compiledThemes = fs
    .readdirSync(themesDir)
    .filter((entry) => entry.endsWith(".css"));
  if (compiledThemes.length === 0) {
    throw new Error("No compiled themes found under themes/*.css.");
  }
  return {
    name: "themes",
    status: "pass",
    detail: `Compiled themes: ${compiledThemes.join(", ")}.`,
  };
}

async function checkPlaywrightLaunch() {
  try {
    const playwright = require("playwright");
    const browser = await playwright.chromium.launch({ headless: true });
    await browser.close();
    return {
      name: "playwright",
      status: "pass",
      detail: "Chromium launch succeeded.",
    };
  } catch (error) {
    return {
      name: "playwright",
      status: "warn",
      detail: `Chromium launch failed: ${error.message}`,
    };
  }
}

async function checkBeautifulMermaidVersion() {
  const fs = require("node:fs");
  const path = require("node:path");
  const { assertSupportedBeautifulMermaidVersion } = require("../src/mermaid-patch");

  let dir = path.dirname(require.resolve("beautiful-mermaid"));
  const root = path.parse(dir).root;

  while (dir !== root) {
    const candidate = path.join(dir, "package.json");
    if (fs.existsSync(candidate)) {
      const pkg = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (pkg.name === "beautiful-mermaid") {
        assertSupportedBeautifulMermaidVersion(pkg.version);
        return {
          name: "beautiful-mermaid",
          status: "pass",
          detail: `Version ${pkg.version} is supported by patch canary.`,
        };
      }
    }
    dir = path.dirname(dir);
  }

  throw new Error("Could not resolve beautiful-mermaid package.json.");
}

function printTextReport(checks) {
  for (const check of checks) {
    process.stdout.write(`[${check.status}] ${check.name}: ${check.detail}\n`);
  }
}

async function main() {
  const { format } = parseArgs(process.argv.slice(2));

  const checks = [];

  const runners = [
    checkNodeRuntime,
    checkMarpBinary,
    checkThemes,
    checkPlaywrightLaunch,
    checkBeautifulMermaidVersion,
  ];

  for (const run of runners) {
    try {
      checks.push(await run());
    } catch (error) {
      checks.push({
        name: run.name,
        status: "fail",
        detail: error.message,
      });
    }
  }

  if (format === "json") {
    process.stdout.write(`${JSON.stringify({ checks }, null, 2)}\n`);
  } else {
    printTextReport(checks);
  }

  const hasFailure = checks.some((check) => check.status === "fail");
  process.exit(hasFailure ? 1 : 0);
}

main();
