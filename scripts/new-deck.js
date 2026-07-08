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

const supportedFlags = new Set(["--paper"]);
const unsupportedFlag = rawArgs.find(
  (arg) => arg.startsWith("--") && !supportedFlags.has(arg),
);
if (unsupportedFlag) {
  console.error(`Error: unsupported option ${unsupportedFlag}`);
  process.exit(1);
}

const paperMode = rawArgs.includes("--paper");
const name = rawArgs.find((arg) => !arg.startsWith("--"));
if (!name) {
  console.error("Usage: npx marpx -n <path> [--paper]");
  console.error("Path is relative to repository root.");
  console.error("Examples:");
  console.error("  npx marpx -n decks/2025/presentation");
  console.error("  npx marpx -n decks/2026/conf-paper --paper");
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
const sharedPath = path.join(deckDir, "shared");
const relativePath = path.relative(deckDir, assetsDir);

// Remove existing symlink if exists
if (
  fs.existsSync(sharedPath) ||
  fs.lstatSync(sharedPath, { throwIfNoEntry: false })
) {
  try {
    fs.unlinkSync(sharedPath);
  } catch (err) {
    // Ignore errors if file doesn't exist
  }
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
    console.log(`  npx marpx ${relativeToRepo}/paper.md       # live preview`);
    console.log(`  npx marpx ${relativeToRepo}/paper.md -v    # validate`);
    console.log(`  npx marpx ${relativeToRepo}/paper.md --pdf # export PDF`);
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
