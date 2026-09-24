const fs = require("fs");
const path = require("path");
const os = require("os");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

const rawArgs = process.argv.slice(2);
if (rawArgs.includes("--poster")) {
  console.error("Error: --poster has been replaced by --paper.");
  process.exit(1);
}

const supportedFlags = new Set(["--paper", "--force"]);
const unsupportedFlag = rawArgs.find(
  (arg) => arg.startsWith("--") && !supportedFlags.has(arg),
);
if (unsupportedFlag) {
  console.error(`Error: unsupported option ${unsupportedFlag}`);
  process.exit(1);
}

const paperMode = rawArgs.includes("--paper");
const force = rawArgs.includes("--force");
const name = rawArgs.find((arg) => !arg.startsWith("--"));
if (!name) {
  console.error("Usage: marpx -n <path> [--paper] [--force]");
  console.error("Path is relative to repository root.");
  console.error("Examples:");
  console.error("  marpx -n decks/2025/presentation");
  console.error("  marpx -n decks/2026/conf-paper --paper");
  process.exit(1);
}

// Resolve all paths from repository root
const repoRoot = path.resolve(__dirname, "..");
const templateDir = path.join(repoRoot, "template");
const decksRoot = path.join(repoRoot, "decks");
// A paper deck is a single full-page canvas; a slide deck gets a brief + slides.
// Paper decks also ship a sibling README with authoring notes that used to live
// inside the rendered markdown body as HTML comments.
const templateFiles = paperMode
  ? [
      ["paper.md", "paper.md"],
      ["paper-README.md", "README.md"],
    ]
  : [
      ["brief.md", "brief.md"],
      ["slide.md", "slide.md"],
    ];
const date = new Date().toISOString().split("T")[0];

function resolveDeckDir(inputPath) {
  const deckDir = path.resolve(repoRoot, inputPath);
  const relativeToRepo = path.relative(repoRoot, deckDir);
  const relativeToDecks = path.relative(decksRoot, deckDir);

  const outsideRepo =
    relativeToRepo.startsWith("..") || path.isAbsolute(relativeToRepo);
  const outsideDecks =
    relativeToDecks.startsWith("..") || path.isAbsolute(relativeToDecks);

  if (outsideRepo || outsideDecks || deckDir === decksRoot) {
    console.error(
      "Error: deck path must be inside decks/ under repository root.",
    );
    console.error(`Received: ${inputPath}`);
    process.exit(1);
  }

  return deckDir;
}

const deckDir = resolveDeckDir(name);

// Check if templates exist
for (const [templateName] of templateFiles) {
  const templatePath = path.join(templateDir, templateName);
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template not found at ${templatePath}`);
    process.exit(1);
  }
}

// Refuse to overwrite authored scaffold files unless --force was given.
// lstat also catches broken symlinks that existsSync would miss.
const existingTargets = templateFiles
  .map(([, outputName]) => path.join(deckDir, outputName))
  .filter((targetPath) =>
    fs.lstatSync(targetPath, { throwIfNoEntry: false }),
  );
if (!force && existingTargets.length > 0) {
  console.error("Error: refusing to overwrite existing files:");
  for (const targetPath of existingTargets) {
    console.error(`  - ${path.relative(repoRoot, targetPath)}`);
  }
  console.error("Re-run with --force to overwrite them.");
  process.exit(1);
}

// A non-symlink `shared` entry may hold authored content; never remove it.
const sharedPath = path.join(deckDir, "shared");
const sharedStat = fs.lstatSync(sharedPath, { throwIfNoEntry: false });
if (sharedStat && !sharedStat.isSymbolicLink()) {
  console.error(
    `Error: ${path.relative(repoRoot, sharedPath)} exists and is not a symlink; leaving it untouched.`,
  );
  process.exit(1);
}

// Create directory
fs.mkdirSync(deckDir, { recursive: true });

// Copy templates with date replacement
for (const [templateName, outputName] of templateFiles) {
  const templatePath = path.join(templateDir, templateName);
  let content = fs.readFileSync(templatePath, "utf8");
  content = content.replaceAll("{{DATE}}", date);
  fs.writeFileSync(path.join(deckDir, outputName), content);
}

// Create local assets directories
fs.mkdirSync(path.join(deckDir, "assets", "img"), { recursive: true });
fs.mkdirSync(path.join(deckDir, "assets", "video"), { recursive: true });
fs.writeFileSync(path.join(deckDir, "assets", "video", ".gitkeep"), "");

// Create shared symlink to global assets
const assetsDir = path.join(repoRoot, "assets");
const relativePath = path.relative(deckDir, assetsDir);

// Remove existing symlink if present; non-symlinks were rejected above.
if (sharedStat) {
  fs.unlinkSync(sharedPath);
}

// Create symlink with OS-specific handling
try {
  const symlinkType = os.platform() === "win32" ? "junction" : "dir";
  fs.symlinkSync(relativePath, sharedPath, symlinkType);
  const relativeToRepo = path.relative(repoRoot, deckDir);
  console.log(`✓ Created${paperMode ? " paper deck" : ""}: ${relativeToRepo}/`);
  for (const [, outputName] of templateFiles) {
    console.log(`  - ${outputName}`);
  }
  console.log(`  - assets/img/`);
  console.log(`  - assets/video/`);
  console.log(`  - shared -> ${relativePath}`);
  if (paperMode) {
    console.log(`\nEdit ${relativeToRepo}/paper.md, then:`);
    console.log(`  marpx ${relativeToRepo}/paper.md       # live preview`);
    console.log(`  marpx ${relativeToRepo}/paper.md -v    # validate`);
    console.log(`  marpx ${relativeToRepo}/paper.md --pdf # export PDF`);
  }
} catch (err) {
  console.error(`Error creating symlink: ${err.message}`);
  if (os.platform() === "win32") {
    console.error(
      "\nNote: On Windows, you may need to run as Administrator or enable Developer Mode.",
    );
    console.error("Alternatively, manually create the symlink:");
    console.error(
      `  mklink /J "${sharedPath}" "${path.resolve(deckDir, relativePath)}"`,
    );
  }
  process.exit(1);
}
