#!/usr/bin/env node
const { parseArgs } = require("node:util");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync, spawn } = require("node:child_process");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

const repoRoot = path.resolve(__dirname, "..");
const scriptsDir = path.join(repoRoot, "scripts");
const configPath = path.join(repoRoot, "marp.config.js");

function printUsage() {
  console.log(`Usage: marpx [options] <file> [page]

Options:
  -p, --preview            Single-shot preview (like marp --preview)
  --overview               Open in overview mode
  --pdf                    Export to PDF
  --lint                   Lint deck and report findings
  --autofix                Apply safe autofixes (for --lint)
  --doctor                 Run environment diagnostics
  --strict                 Enable strict mode for selected commands
  --screenshot <page>      Screenshot a slide (1-based displayed page)
  -v, --validate           Validate deck
  -n, --new                Create new deck
  --outline                Generate outline from brief
  --no-strict-brief        Allow incomplete brief schema for --outline
  --format <fmt>           Output format: text, json, sarif
  --theme [name]           Build theme(s) (all if name omitted)
  -w, --watch              Watch mode (for --theme)
  --output <path>          Output path (for --outline)
  --report-dir <dir>       Report directory (for --validate)
  -h, --help               Show this help

Without options, starts a live-reload server (serve + watch).

Examples:
  marpx decks/2025/talk/slide.md            Serve with live reload (default)
  marpx decks/2025/talk/slide.md 5          Serve, open at page 5
  marpx decks/2025/talk/slide.md -p         Single-shot preview
  marpx decks/2025/talk/slide.md --overview Overview mode
  marpx decks/2025/talk/slide.md --pdf      Export PDF
  marpx decks/2025/talk/slide.md --lint     Lint
  marpx decks/2025/talk/slide.md --lint --autofix  Lint with safe autofix
  marpx decks/2025/talk/slide.md --screenshot 5  Screenshot slide 5
  marpx decks/2025/talk/slide.md -v         Validate
  marpx -n decks/2025/talk                  New deck
  marpx decks/2025/talk/brief.md --outline  Generate outline
  marpx --doctor                             Environment diagnostics
  marpx --theme                             Build all themes
  marpx --theme lab                         Build lab theme only
  marpx --theme -w                          Watch all themes`);
}

let parsed;

try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    options: {
      preview: { type: "boolean", short: "p", default: false },
      overview: { type: "boolean", default: false },
      pdf: { type: "boolean", default: false },
      screenshot: { type: "string" },
      lint: { type: "boolean", default: false },
      autofix: { type: "boolean", default: false },
      doctor: { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
      validate: { type: "boolean", short: "v", default: false },
      new: { type: "boolean", short: "n", default: false },
      outline: { type: "boolean", default: false },
      "no-strict-brief": { type: "boolean", default: false },
      format: { type: "string" },
      theme: { type: "boolean", default: false },
      watch: { type: "boolean", short: "w", default: false },
      output: { type: "string" },
      "report-dir": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: true,
  });
} catch (error) {
  console.error(error.message);
  printUsage();
  process.exit(1);
}

const { values, positionals } = parsed;

if (values.help) {
  printUsage();
  process.exit(0);
}

// Determine mode from flags (default: serve)
const modes = [
  "preview",
  "overview",
  "pdf",
  "screenshot",
  "lint",
  "doctor",
  "validate",
  "new",
  "outline",
  "theme",
].filter(
  (m) => values[m],
);

if (modes.length > 1) {
  console.error(`Error: conflicting options: ${modes.map((m) => `--${m}`).join(", ")}`);
  process.exit(1);
}

const mode = modes[0] || "serve";

if (values.autofix && mode !== "lint") {
  console.error("Error: --autofix can only be used with --lint");
  process.exit(1);
}

if (values["no-strict-brief"] && mode !== "outline") {
  console.error("Error: --no-strict-brief can only be used with --outline");
  process.exit(1);
}

if (values.format && !["text", "json", "sarif"].includes(values.format)) {
  console.error(`Error: unsupported --format value "${values.format}"`);
  process.exit(1);
}

// Dispatch to existing scripts
function runScript(scriptName, args) {
  const scriptPath = path.join(scriptsDir, scriptName);
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(signal === "SIGINT" ? 130 : 143);
    }
    process.exit(code ?? 1);
  });
}

function getMarpBin() {
  return path.join(repoRoot, "node_modules", ".bin", "marp");
}

function getChromePath() {
  return execFileSync(
    process.execPath,
    [
      "-e",
      'const {chromium} = require("playwright"); process.stdout.write(chromium.executablePath())',
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

function discoverThemes() {
  const srcDir = path.join(repoRoot, "themes", "src");
  return fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".css") && !f.startsWith("_"))
    .map((f) => f.replace(/\.css$/, ""));
}

function getTailwindBin() {
  return path.join(repoRoot, "node_modules", ".bin", "tailwindcss");
}

function runMarp(extraArgs) {
  const chromePath = getChromePath();
  const child = spawn(
    getMarpBin(),
    [
      "--browser-path",
      chromePath,
      "--config",
      configPath,
      ...extraArgs,
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
  child.on("exit", (code, signal) => {
    if (signal) process.exit(signal === "SIGINT" ? 130 : 143);
    process.exit(code ?? 1);
  });
}

switch (mode) {
  case "serve":
    runScript("marp-serve.js", positionals);
    break;

  case "preview": {
    if (positionals.length === 0) {
      console.error("Error: file path required for --preview");
      process.exit(1);
    }
    runMarp(["--preview", ...positionals]);
    break;
  }

  case "overview":
    runScript("preview-overview.js", positionals);
    break;

  case "screenshot": {
    if (positionals.length === 0) {
      console.error("Error: file path required for --screenshot");
      process.exit(1);
    }

    const ssDeckPath = path.resolve(positionals[0]);
    const displayedPage = Number(values.screenshot);

    if (!Number.isInteger(displayedPage) || displayedPage < 1) {
      console.error("Error: --screenshot requires a positive integer page number");
      process.exit(1);
    }

    const { findSlideIdByDisplayedPage } = require("../src/marp-pagination");
    const { renderToHtml, screenshotSlide } = require("../src/visual-overflow");

    const entry = findSlideIdByDisplayedPage(ssDeckPath, configPath, displayedPage);
    // Marp assigns id="1", id="2", … to sections, so fall back to the
    // slide number when pagination metadata is absent.
    const slideId = entry ? entry.slideId : String(displayedPage);

    const { htmlPath, tempRoot } = renderToHtml(ssDeckPath);

    screenshotSlide(htmlPath, slideId)
      .then((buffer) => {
        const screenshotPath = path.join(
          os.tmpdir(),
          `marpx-screenshot-${path.basename(ssDeckPath, ".md")}-p${displayedPage}.png`,
        );
        fs.writeFileSync(screenshotPath, buffer);
        process.stdout.write(screenshotPath + "\n");
      })
      .catch((err) => {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      })
      .finally(() => {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      });
    break;
  }

  case "pdf": {
    if (positionals.length === 0) {
      console.error("Error: file path required for --pdf");
      process.exit(1);
    }
    runMarp(["--pdf", "--allow-local-files", ...positionals]);
    break;
  }

  case "validate": {
    const args = [...positionals];
    if (values["report-dir"]) {
      args.push("--report-dir", values["report-dir"]);
    }
    if (values.strict) {
      args.push("--strict-visual");
    }
    if (values.format) {
      args.push("--format", values.format);
    }
    runScript("validate-deck.js", args);
    break;
  }

  case "lint": {
    const args = [...positionals];
    if (values.autofix) {
      args.push("--autofix");
    }
    if (values.strict) {
      args.push("--strict-visual");
    }
    if (values.format) {
      args.push("--format", values.format);
    }
    runScript("lint-deck.js", args);
    break;
  }

  case "new":
    runScript("new-deck.js", positionals);
    break;

  case "outline": {
    const args = [...positionals];
    if (values.output) {
      args.push("--output", values.output);
    }
    if (values["no-strict-brief"]) {
      args.push("--no-strict-brief");
    }
    runScript("generate-outline.js", args);
    break;
  }

  case "doctor": {
    const args = [];
    if (values.format && ["text", "json"].includes(values.format)) {
      args.push("--format", values.format);
    } else if (values.format && !["text", "json"].includes(values.format)) {
      console.error('Error: --doctor supports only --format "text" or "json"');
      process.exit(1);
    }
    runScript("doctor.js", args);
    break;
  }

  case "theme": {
    const allThemes = discoverThemes();

    if (allThemes.length === 0) {
      console.error("Error: no themes found in themes/src/");
      process.exit(1);
    }

    // If a positional is given, treat it as a theme name filter
    const requestedName = positionals[0];
    const themes = requestedName
      ? allThemes.filter((t) => t === requestedName)
      : allThemes;

    if (themes.length === 0) {
      console.error(
        `Error: theme "${requestedName}" not found. Available: ${allThemes.join(", ")}`,
      );
      process.exit(1);
    }

    const tailwind = getTailwindBin();
    const watchFlag = values.watch;
    const children = [];

    for (const name of themes) {
      const input = path.join(repoRoot, "themes", "src", `${name}.css`);
      const output = path.join(repoRoot, "themes", `${name}.css`);
      const args = ["-i", input, "-o", output];
      if (watchFlag) args.push("--watch");

      const label = `[theme:${name}]`;
      console.log(`${label} ${input} -> ${output}${watchFlag ? " (watching)" : ""}`);

      const child = spawn(tailwind, args, {
        cwd: repoRoot,
        stdio: watchFlag ? "inherit" : ["inherit", "pipe", "pipe"],
      });

      if (!watchFlag) {
        child.stdout?.on("data", (d) => process.stdout.write(`${label} ${d}`));
        child.stderr?.on("data", (d) => process.stderr.write(`${label} ${d}`));
      }

      children.push(child);
    }

    if (watchFlag) {
      // In watch mode, forward signals to all children
      for (const sig of ["SIGINT", "SIGTERM"]) {
        process.on(sig, () => {
          for (const child of children) child.kill(sig);
        });
      }
    }

    // Wait for all children to exit
    let exitCode = 0;
    let exited = 0;
    for (const child of children) {
      child.on("exit", (code) => {
        if (code && code > exitCode) exitCode = code;
        exited++;
        if (exited === children.length) process.exit(exitCode);
      });
    }
    break;
  }
}
