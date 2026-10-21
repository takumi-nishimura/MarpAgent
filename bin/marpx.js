#!/usr/bin/env node
const { parseArgs } = require("node:util");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync, spawn } = require("node:child_process");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");
const { marpBrowserArgs } = require("../src/marp-browser");
const { conversionTimeout, runConversion } = require("../src/conversion-runtime");

enforceSupportedNodeRuntime();

// Asset subcommands have their own options and do not start a render process.
if (process.argv[2] === "assets") {
  require("../src/assets-cli").runAssetsCli(process.argv.slice(3));
  return;
}

const repoRoot = path.resolve(__dirname, "..");
const scriptsDir = path.join(repoRoot, "scripts");
const configPath = path.join(repoRoot, "marp.config.js");

function printUsage() {
  console.log(`Usage: marpx [options] <file> [page]
       marpx assets <list|search|doctor|reuse> [options]

Options:
  -p, --preview            Single-shot preview (like marp --preview)
  --overview               Open in overview mode
  --pdf                    Export to PDF
  --pptx                   Export to PPTX
  --html                   Export to standalone HTML
  --zip                    Export a portable HTML resource bundle
  --strict-offline          Reject remote/unsupported dependencies (for --zip)
  --bundle-root <dir>       Allowed resource root (default: this repository)
  --max-bundle-files <n>    Resource limit (default: 10000; for --zip)
  --max-bundle-bytes <n>    Resource byte limit (default: 268435456; for --zip)
  --images [png|jpeg]      Export each slide as an image (default: png)
  --lint                   Deprecated alias of -v
  --autofix                Apply safe autofixes (for -v, --lint)
  --dry-run                Show an --autofix diff or --zip manifest without writing
  --doctor                 Run environment diagnostics
  --strict                 Require the rendered check (fail if it cannot run)
  --hints                  List source-heuristic hints (for -v, --lint)
  --screenshot <page>      Screenshot a slide by displayed page number
  -v, --validate           Validate deck
  -n, --new                Create new deck
  --paper                  Scaffold an A-series paper deck (with --new)
  --outline                Deprecated: generate outline from a legacy brief
  --no-strict-brief        Allow incomplete legacy brief schema for --outline
  --format <fmt>           Output format: text, json, sarif
  --theme [name]           Build theme(s) (all if name omitted)
  --theme-new              Scaffold a new theme
  --source-url <url>       Source URL note for --theme-new
  --force                  Overwrite existing files (for --new, --theme-new, --outline, --zip)
  --no-build               Scaffold only; skip token/theme build for --theme-new
  -w, --watch              Watch mode (for --theme)
  -o, --output <path>      Output path (for --outline, exports, --screenshot)
  --report-dir <dir>       Report directory (for -v, --lint)
  -h, --help               Show this help

Without options, starts a live-reload server (serve + watch).

Page arguments (serve [page], --overview [page], --screenshot <page>) take the
page number shown on the slide. Decks that show no page numbers take the
position among rendered slides instead. Hidden slides cannot be addressed.

Examples:
  marpx assets list --repo . --format json  List repository media
  marpx assets search "figure" --preview    Search and write a local preview
  marpx assets --help                     Asset reuse and diagnostic options
  marpx decks/2025/talk/slide.md            Serve with live reload (default)
  marpx decks/2025/talk/slide.md 5          Serve, open at displayed page 5
  marpx decks/2025/talk/slide.md -p         Single-shot preview
  marpx decks/2025/talk/slide.md --overview Overview mode
  marpx decks/2025/talk/slide.md --pdf      Export PDF
  marpx decks/2025/talk/slide.md --pptx     Export PPTX
  marpx decks/2025/talk/slide.md --html     Export standalone HTML
  marpx decks/2025/talk/slide.md --zip --output out/talk.zip  Export a portable bundle
  marpx decks/2025/talk/slide.md --zip --dry-run  Inspect the collection manifest
  marpx decks/2025/talk/slide.md --zip --strict-offline  Require local dependencies
  marpx decks/2025/talk/slide.md --images jpeg --output out/slide.jpg  Export slide images
  marpx decks/2025/talk/slide.md --pdf --output out/talk.pdf  Export PDF to a chosen path
  marpx decks/2025/talk/slide.md --screenshot 5  Screenshot the slide showing page 5
  marpx decks/2025/talk/slide.md --screenshot 5 --output out/slide5.png  Screenshot to a chosen path
  marpx decks/2025/talk/slide.md -v         Validate
  marpx decks/2025/talk/slide.md -v --autofix  Validate with safe autofix
  marpx decks/2025/talk/slide.md -v --autofix --dry-run  Preview autofix changes as a diff
  marpx -n decks/2025/talk                  New deck
  marpx -n decks/2025/paper --paper         New A-series paper deck
  marpx --doctor                             Environment diagnostics
  marpx --theme                             Build all themes
  marpx --theme lab                         Build lab theme only
  marpx --theme-new my-theme --source-url https://example.com/design  New theme scaffold
  marpx --theme -w                          Watch all themes`);
}

// Bare "--images" defaults to png; parseArgs string options require a value,
// so expand it before parsing. A following non-flag token stays the value.
const cliArgs = process.argv
  .slice(2)
  .map((arg, index, all) =>
    arg === "--images" && (!all[index + 1] || all[index + 1].startsWith("-"))
      ? "--images=png"
      : arg,
  );

let parsed;

try {
  parsed = parseArgs({
    args: cliArgs,
    options: {
      preview: { type: "boolean", short: "p", default: false },
      overview: { type: "boolean", default: false },
      pdf: { type: "boolean", default: false },
      pptx: { type: "boolean", default: false },
      html: { type: "boolean", default: false },
      zip: { type: "boolean", default: false },
      "strict-offline": { type: "boolean", default: false },
      "bundle-root": { type: "string" },
      "max-bundle-files": { type: "string" },
      "max-bundle-bytes": { type: "string" },
      images: { type: "string" },
      screenshot: { type: "string" },
      lint: { type: "boolean", default: false },
      autofix: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      doctor: { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
      hints: { type: "boolean", default: false },
      validate: { type: "boolean", short: "v", default: false },
      new: { type: "boolean", short: "n", default: false },
      paper: { type: "boolean", default: false },
      poster: { type: "boolean", default: false },
      outline: { type: "boolean", default: false },
      "no-strict-brief": { type: "boolean", default: false },
      format: { type: "string" },
      theme: { type: "boolean", default: false },
      "theme-new": { type: "boolean", default: false },
      "source-url": { type: "string" },
      force: { type: "boolean", default: false },
      "no-build": { type: "boolean", default: false },
      watch: { type: "boolean", short: "w", default: false },
      output: { type: "string", short: "o" },
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
  "pptx",
  "html",
  "zip",
  "images",
  "screenshot",
  "lint",
  "doctor",
  "validate",
  "new",
  "outline",
  "theme",
  "theme-new",
].filter(
  (m) => values[m],
);

if (modes.length > 1) {
  console.error(`Error: conflicting options: ${modes.map((m) => `--${m}`).join(", ")}`);
  process.exit(1);
}

const mode = modes[0] || "serve";

const exportModes = new Set(["pdf", "pptx", "html", "images", "zip"]);
const outputModes = new Set([...exportModes, "screenshot", "outline"]);

if (values.images !== undefined && !["png", "jpeg"].includes(values.images)) {
  console.error(`Error: --images must be "png" or "jpeg"`);
  process.exit(1);
}

if (values.output && !outputModes.has(mode)) {
  console.error(
    "Error: --output can only be used with --outline, --screenshot, --pdf, --pptx, --html, --images, or --zip",
  );
  process.exit(1);
}

if (values.autofix && mode !== "validate" && mode !== "lint") {
  console.error("Error: --autofix can only be used with --validate or --lint");
  process.exit(1);
}

if (values["dry-run"] && !values.autofix && mode !== "zip") {
  console.error("Error: --dry-run requires --autofix or --zip");
  process.exit(1);
}

for (const option of [
  "strict-offline",
  "bundle-root",
  "max-bundle-files",
  "max-bundle-bytes",
]) {
  if (
    (values[option] === true || typeof values[option] === "string") &&
    mode !== "zip"
  ) {
    console.error(`Error: --${option} can only be used with --zip`);
    process.exit(1);
  }
}
if (values["bundle-root"] !== undefined && values["bundle-root"].trim() === "") {
  console.error("Error: --bundle-root requires a directory path");
  process.exit(1);
}
for (const option of ["max-bundle-files", "max-bundle-bytes"]) {
  if (
    values[option] !== undefined &&
    (!/^[1-9]\d*$/.test(values[option]) ||
      !Number.isSafeInteger(Number(values[option])))
  ) {
    console.error(`Error: --${option} must be a positive safe integer`);
    process.exit(1);
  }
}

if (values.hints && mode !== "validate" && mode !== "lint") {
  console.error("Error: --hints can only be used with --validate or --lint");
  process.exit(1);
}

if (values.strict && mode !== "validate" && mode !== "lint") {
  console.error("Error: --strict can only be used with --validate or --lint");
  process.exit(1);
}

if (values.format && !["validate", "lint", "doctor"].includes(mode)) {
  console.error(
    "Error: --format can only be used with --validate, --lint, or --doctor",
  );
  process.exit(1);
}

if (values["no-strict-brief"] && mode !== "outline") {
  console.error("Error: --no-strict-brief can only be used with --outline");
  process.exit(1);
}

if (values.poster) {
  console.error("Error: --poster has been replaced by --paper.");
  process.exit(1);
}

if (values.paper && mode !== "new") {
  console.error("Error: --paper can only be used with --new");
  process.exit(1);
}

if (values.watch && mode !== "theme") {
  console.error("Error: --watch can only be used with --theme");
  process.exit(1);
}

if (values["source-url"] && mode !== "theme-new") {
  console.error("Error: --source-url can only be used with --theme-new");
  process.exit(1);
}

if (
  values.force &&
  mode !== "theme-new" &&
  mode !== "new" &&
  mode !== "outline" &&
  mode !== "zip"
) {
  console.error(
    "Error: --force can only be used with --new, --theme-new, --outline, or --zip",
  );
  process.exit(1);
}

if (values["no-build"] && mode !== "theme-new") {
  console.error("Error: --no-build can only be used with --theme-new");
  process.exit(1);
}

if (values.format && !["text", "json", "sarif"].includes(values.format)) {
  console.error(`Error: unsupported --format value "${values.format}"`);
  process.exit(1);
}

// Forward termination signals so killing marpx also stops the mode script it
// spawned (and that script's own children). marpx stays alive until the child
// exits, then reports the child's status via the exit handler.
function forwardChildSignals(child) {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (!child.killed) child.kill(signal);
    });
  }
}

// Keep D2/mise and relative explicit fonts in the original project even when
// a mode script renders from this checkout or a temporary copied deck.
process.env.MARP_AGENT_D2_CWD ||= positionals[0]
  ? path.dirname(path.resolve(positionals[0]))
  : process.cwd();

// Dispatch to existing scripts
function runScript(scriptName, args) {
  const scriptPath = path.join(scriptsDir, scriptName);
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  forwardChildSignals(child);

  child.once("error", (error) => {
    console.error(`Error: failed to start ${scriptPath}: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(signal === "SIGINT" ? 130 : 143);
    }
    process.exit(code ?? 1);
  });
}

function getMarpBin() {
  // Theme commands do not require Marp or its rendering dependencies.
  return require("../src/preview-runtime").getMarpBin(repoRoot);
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

function designExists(name) {
  return fs.existsSync(path.join(repoRoot, "designs", name, "DESIGN.md"));
}

function generateDesignTokens(name) {
  if (!designExists(name)) return;
  execFileSync(
    process.execPath,
    [path.join(scriptsDir, "generate-design-tokens.js"), "--design", name],
    { cwd: repoRoot, stdio: "inherit" },
  );
}

function watchDesignTokens(names) {
  const timers = new Map();
  const watchers = [];

  for (const name of names) {
    if (!designExists(name)) continue;
    const designPath = path.join(repoRoot, "designs", name, "DESIGN.md");
    // Editors commonly replace DESIGN.md with a new inode on save. Watch
    // its parent so subsequent saves keep reaching the same watcher.
    const watcher = fs.watch(path.dirname(designPath), (_event, fileName) => {
      if (fileName && fileName.toString() !== path.basename(designPath)) return;
      const currentTimer = timers.get(name);
      if (currentTimer) clearTimeout(currentTimer);
      timers.set(
        name,
        setTimeout(() => {
          timers.delete(name);
          try {
            generateDesignTokens(name);
          } catch (error) {
            console.error(
              `Error: failed to regenerate ${name} design tokens: ${error.message}`,
            );
          }
        }, 100),
      );
    });
    watchers.push(watcher);
    console.log(`[theme:${name}] Watching designs/${name}/DESIGN.md`);
  }
  return () => {
    for (const timer of timers.values()) clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
  };
}

// Upper bound for one-shot conversions so a stalled browser fails with a
// clear error instead of hanging (ISS-0029). The interactive --preview is not
// bounded. Override with MARP_AGENT_CONVERT_TIMEOUT_MS.
let CONVERT_TIMEOUT_MS;
if ([...exportModes, "screenshot", "validate", "lint"].includes(mode)) {
  try {
    CONVERT_TIMEOUT_MS = conversionTimeout();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function runMarp(extraArgs, { timeoutMs = null } = {}) {
  if (!fs.existsSync(getMarpBin())) {
    console.error(`Error: Marp CLI binary not found: ${getMarpBin()}`);
    process.exit(1);
  }
  let browserArgs;
  try {
    browserArgs = mode === "html" ? [] : marpBrowserArgs({ repoRoot });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  runConversion(
    getMarpBin(),
    [...browserArgs, "--config", configPath, ...extraArgs],
    {
      cwd: repoRoot,
      timeoutMs,
      env: {
        ...process.env,
        MARP_AGENT_D2_CWD: process.env.MARP_AGENT_D2_CWD || process.cwd(),
        ...(exportModes.has(mode) ? { MARP_AGENT_D2_STRICT: "1" } : {}),
      },
    },
  )
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
    });
}

switch (mode) {
  case "zip": {
    if (positionals.length !== 1) {
      console.error("Error: exactly one file path required for --zip");
      process.exitCode = 1;
      break;
    }
    try {
      const { exportPortableBundle } = require("../src/portable-export");
      const result = exportPortableBundle({
        deckPath: positionals[0],
        repoRoot: values["bundle-root"]
          ? path.resolve(values["bundle-root"])
          : repoRoot,
        outputPath: values.output,
        dryRun: values["dry-run"],
        force: values.force,
        strictOffline: values["strict-offline"],
        maxFiles: values["max-bundle-files"] === undefined
          ? undefined
          : Number(values["max-bundle-files"]),
        maxBytes: values["max-bundle-bytes"] === undefined
          ? undefined
          : Number(values["max-bundle-bytes"]),
      });
      if (values["dry-run"]) console.log(JSON.stringify(result.manifest, null, 2));
      else if (result.errors.length)
        console.error(JSON.stringify(result.errors, null, 2));
      else console.log(`Portable HTML bundle: ${result.outputPath}`);
      if (result.errors.length) process.exitCode = 1;
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.code) console.error(error.code);
      process.exitCode = 1;
    }
    break;
  }

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

    // Resolve through the slide map: the displayed page number, or the
    // rendered position when the deck shows no page numbers. Hidden slides
    // cannot be addressed.
    const entry = findSlideIdByDisplayedPage(ssDeckPath, configPath, displayedPage);
    if (!entry) {
      console.error(
        `Error: displayed page ${displayedPage} was not found in ${path.relative(process.cwd(), ssDeckPath)}`,
      );
      process.exit(1);
    }
    const slideId = entry.slideId;

    let htmlPath;
    let tempRoot;
    const screenshotStarted = Date.now();

    Promise.resolve()
      .then(() => {
        ({ htmlPath, tempRoot } = renderToHtml(ssDeckPath));
        require("../src/d2-diagnostics").assertD2RenderSucceeded(
          fs.readFileSync(htmlPath, "utf8"),
        );
        return screenshotSlide(htmlPath, slideId, {
          timeoutMs: Math.max(1, CONVERT_TIMEOUT_MS - (Date.now() - screenshotStarted)),
        });
      })
      .then((buffer) => {
        const screenshotPath = values.output
          ? path.resolve(values.output)
          : path.join(
              os.tmpdir(),
              `marpx-screenshot-${path.basename(ssDeckPath, ".md")}-p${displayedPage}.png`,
            );
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        fs.writeFileSync(screenshotPath, buffer);
        process.stdout.write(screenshotPath + "\n");
      })
      .catch((err) => {
        console.error(`Error: ${err.message}`);
        process.exitCode = 1;
      })
      .finally(() => {
        if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
      });
    break;
  }

  // HTML is Marp's default conversion: no format flag, directed by -o.
  case "pdf":
  case "pptx":
  case "html":
  case "images": {
    if (positionals.length === 0) {
      console.error(`Error: file path required for --${mode}`);
      process.exit(1);
    }

    const args = [];
    if (mode === "pdf") args.push("--pdf");
    if (mode === "pptx") args.push("--pptx");
    if (mode === "images") args.push("--images", values.images);
    args.push("--allow-local-files");
    if (values.output) args.push("-o", path.resolve(values.output));
    args.push(...positionals);
    runMarp(args, { timeoutMs: CONVERT_TIMEOUT_MS });
    break;
  }

  // --lint is a deprecated alias of -v; scripts/lint-deck.js prints the
  // deprecation notice so direct script use shows it too.
  case "validate":
  case "lint": {
    const args = [...positionals];
    if (values["report-dir"]) {
      args.push("--report-dir", values["report-dir"]);
    }
    if (values.autofix) {
      args.push("--autofix");
    }
    if (values["dry-run"]) {
      args.push("--dry-run");
    }
    if (values.strict) {
      args.push("--strict-visual");
    }
    if (values.hints) {
      args.push("--hints");
    }
    if (values.format) {
      args.push("--format", values.format);
    }
    runScript(mode === "lint" ? "lint-deck.js" : "validate-deck.js", args);
    break;
  }

  case "new": {
    const args = [...positionals];
    if (values.paper) {
      args.push("--paper");
    }
    if (values.force) {
      args.push("--force");
    }
    runScript("new-deck.js", args);
    break;
  }

  case "outline": {
    const args = [...positionals];
    if (values.output) {
      args.push("--output", values.output);
    }
    if (values["no-strict-brief"]) {
      args.push("--no-strict-brief");
    }
    if (values.force) {
      args.push("--force");
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

    try {
      for (const name of themes) generateDesignTokens(name);
    } catch (error) {
      console.error(`Error: failed to generate design tokens: ${error.message}`);
      process.exit(1);
    }

    const tailwind = getTailwindBin();
    const watchFlag = values.watch;
    const children = [];

    const stopWatching = watchFlag ? watchDesignTokens(themes) : () => {};
    let exitCode = 0;
    let exited = 0;
    let shutdownTimer;
    const stopChildren = (signal) => {
      stopWatching();
      for (const child of children) child.kill(signal);
      if (!shutdownTimer) {
        shutdownTimer = setTimeout(() => {
          for (const child of children) child.kill("SIGKILL");
        }, 1000);
      }
    };
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => {
        exitCode ||= 128 + os.constants.signals[signal];
        stopChildren(signal);
      });
    }

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
      child.once("error", (error) => {
        console.error(`Error: failed to start theme compiler ${name}: ${error.message}`);
        exitCode ||= 1;
        stopChildren("SIGTERM");
      });
      // close also fires after spawn errors and after buffered diagnostics flush.
      child.once("close", (code, signal) => {
        exitCode ||= code ?? (signal ? 128 + os.constants.signals[signal] : 1);
        if (exitCode) stopChildren("SIGTERM");
        exited++;
        if (exited === children.length) {
          clearTimeout(shutdownTimer);
          stopWatching();
          process.exit(exitCode);
        }
      });
    }
    break;
  }

  case "theme-new": {
    const args = [...positionals];
    if (values["source-url"]) {
      args.push("--source-url", values["source-url"]);
    }
    if (values.force) {
      args.push("--force");
    }
    if (values["no-build"]) {
      args.push("--no-build");
    }
    runScript("new-theme.js", args);
    break;
  }
}
