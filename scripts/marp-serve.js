const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const {
  buildDeckUrl,
  parseDeckAndPageArgs,
} = require("../src/preview-cli");
const {
  forwardChildSignals,
  forwardLines,
  getMarpBin,
  openBrowser,
  resolveRequestedSlideId,
} = require("../src/preview-runtime");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "marp.config.js");

function printUsage() {
  console.error("Usage: npx marpx <deck.md> [displayed-page]");
}

function main() {
  let parsedArgs;

  try {
    parsedArgs = parseDeckAndPageArgs(process.argv.slice(2), {
      repoRoot,
    });
  } catch (error) {
    printUsage();
    console.error(error.message);
    process.exit(1);
  }

  const { deckPath, displayedPage } = parsedArgs;

  if (!fs.existsSync(deckPath)) {
    console.error(`Deck not found: ${deckPath}`);
    process.exit(1);
  }

  let slideId;

  try {
    slideId = resolveRequestedSlideId(
      deckPath,
      configPath,
      displayedPage,
      repoRoot,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const deckDir = path.dirname(deckPath);
  const marpBin = getMarpBin(repoRoot);
  const child = spawn(
    marpBin,
    ["--server", "--watch", "--config", configPath, deckDir],
    {
      cwd: repoRoot,
      stdio: ["inherit", "pipe", "pipe"],
    },
  );

  let opened = false;

  const tryOpen = (line) => {
    if (opened) return;
    const match = line.match(/http:\/\/localhost:\d+/);
    if (!match) return;

    const url = buildDeckUrl(match[0], deckPath, slideId);
    const browser = openBrowser(url);
    browser?.unref();
    opened = true;
    process.stdout.write(`[preview] Opened ${url}\n`);
  };

  forwardLines(child.stdout, process.stdout, tryOpen);
  forwardLines(child.stderr, process.stderr, tryOpen);
  forwardChildSignals(child);

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(signal === "SIGINT" ? 130 : 143);
      return;
    }

    process.exit(code ?? 1);
  });
}

main();
