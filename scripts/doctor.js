const fs = require("node:fs");
const path = require("node:path");
const { findPackageJSON } = require("node:module");
const { pathToFileURL } = require("node:url");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = [...argv];
  let format = "text";
  const usage = "Usage: marpx --doctor [--format text|json]";

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
    detail: `Node ${process.versions.node} matches .mise.toml node ${policy.configuredVersion}.`,
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
    detail: `CLI ${require("@marp-team/marp-cli/package.json").version}: ${marpPath}.`,
  };
}

function checkConfiguredEngine({ createMarp } = {}) {
  const { Marp } = require("@marp-team/marp-core/full");
  const { createConfiguredMarp } = require("../src/slide-map");
  const version = require("@marp-team/marp-core/package.json").version;
  const create = createMarp || createConfiguredMarp;

  for (const math of ["katex", "mathjax"]) {
    const marp = create();
    if (!(marp instanceof Marp)) {
      throw new Error(
        `The configured engine is not the installed full Core ${version}.`,
      );
    }
    const { html } = marp.render(`---
math: ${math}
---
$x^2$

\`\`\`js {1}
const value = 42;
\`\`\`

\`\`\`mermaid
flowchart LR
A["日本語 $x<y$"] --> B[Output]
\`\`\`

\`\`\`mermaid interactive
flowchart LR
A --> B
\`\`\`
`);
    const checks = [
      ["Shiki", /class="shiki marp-shiki"/],
      ["line highlighting", /class="line highlighted"/],
      [math, math === "katex" ? /class="katex"/ : /<mjx-container/],
      ["extended Mermaid", /class="mermaid-diagram"/],
      ["diagram math", /data-mml-node="math"/],
      ["native Mermaid", /data-marp-mermaid/],
    ];
    for (const [feature, pattern] of checks) {
      if (!pattern.test(html))
        throw new Error(
          `Core ${version}: ${feature} did not render (${math} probe).`,
        );
    }
    if (/katex-error|data-mjx-error|data-marpagent-render-error/.test(html)) {
      throw new Error(
        `Core ${version}: the ${math} probe contains a rendering error.`,
      );
    }
  }

  const features = [
    "shiki",
    "line-highlight",
    "katex",
    "mathjax",
    "mermaid-math",
    "mermaid-native",
  ];
  return {
    name: "marp-engine",
    status: "pass",
    version,
    features,
    detail: `Configured full Core ${version}: ${features.join(", ")} rendered successfully.`,
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
  const file = findPackageJSON("beautiful-mermaid", pathToFileURL(__filename));
  const { version } = JSON.parse(fs.readFileSync(file, "utf8"));
  const { renderMermaidSVG } = await import("beautiful-mermaid");
  renderMermaidSVG("flowchart LR\nA --> B");
  return {
    name: "beautiful-mermaid",
    status: "pass",
    detail: `Version ${version} renders SVG successfully.`,
  };
}

function checkD2() {
  try {
    const { resolveD2 } = require("../src/d2-render");
    const { runD2ProcessSync } = require("../src/d2-process");
    const cwd = process.env.MARP_AGENT_D2_CWD || process.cwd();
    const runtime = resolveD2({ cwd });
    const layouts = runD2ProcessSync(runtime.executable, ["layout"], {
      cwd,
      env: runtime.env,
      timeoutMs: runtime.timeoutMs,
      maxBuffer: 65536,
    }).stdout;
    if (!/tala \(bundled\)/.test(layouts))
      throw new Error("TALA is not available as a bundled layout.");
    return {
      name: "d2",
      status: "pass",
      executable: runtime.executable,
      version: runtime.version,
      tala: true,
      detail: `Optional D2 ${runtime.version}: ${runtime.executable}; TALA is bundled.`,
    };
  } catch (error) {
    return {
      name: "d2",
      status: "warn",
      detail: `${error.message} Decks without D2 fences do not need D2.`,
    };
  }
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
    checkConfiguredEngine,
    checkThemes,
    checkPlaywrightLaunch,
    checkBeautifulMermaidVersion,
    checkD2,
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

if (require.main === module) main();

module.exports = { checkConfiguredEngine, checkD2 };
