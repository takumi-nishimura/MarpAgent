#!/usr/bin/env node
const { parseArgs } = require("node:util");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const scriptsDir = path.join(repoRoot, "scripts");
const configPath = path.join(repoRoot, "marp.config.js");

function printUsage() {
  console.log(`Usage: marpx [options] <file> [page]

Options:
  -p, --preview            Single-shot preview (like marp --preview)
  --overview               Open in overview mode
  --pdf                    Export to PDF
  -v, --validate           Validate deck
  -n, --new                Create new deck
  --outline                Generate outline from brief
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
  marpx decks/2025/talk/slide.md -v         Validate
  marpx -n decks/2025/talk                  New deck
  marpx decks/2025/talk/brief.md --outline  Generate outline
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
      validate: { type: "boolean", short: "v", default: false },
      new: { type: "boolean", short: "n", default: false },
      outline: { type: "boolean", default: false },
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
const modes = ["preview", "overview", "pdf", "validate", "new", "outline", "theme"].filter(
  (m) => values[m],
);

if (modes.length > 1) {
  console.error(`Error: conflicting options: ${modes.map((m) => `--${m}`).join(", ")}`);
  process.exit(1);
}

const mode = modes[0] || "serve";

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
    runScript("validate-deck.js", args);
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
    runScript("generate-outline.js", args);
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
