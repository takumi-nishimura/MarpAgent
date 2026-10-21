const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");
const {
  getBindAddress,
  previewBaseUrls,
  warnIfPublic,
} = require("../src/preview-binding");

const { buildDeckUrl, parseDeckAndPageArgs } = require("../src/preview-cli");
const {
  forwardChildSignals,
  forwardLines,
  getMarpBin,
  isHttpPortConflict,
  isNotifierPortConflict,
  openBrowser,
  resolveRequestedSlide,
} = require("../src/preview-runtime");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "marp.config.js");

const MAX_NOTIFIER_RETRIES = 5;
const NOTIFIER_RETRY_DELAY_MS = 250;
const DEFAULT_HTTP_PORT = 8080;
const MAX_HTTP_PORT_ATTEMPTS = 10;
const LAST_HTTP_PORT = DEFAULT_HTTP_PORT + MAX_HTTP_PORT_ATTEMPTS - 1;

enforceSupportedNodeRuntime();

function printUsage() {
  console.error("Usage: marpx <deck.md> [displayed-page]");
  console.error(
    "The page is the number shown on the slide; decks without page numbers use the position among rendered slides.",
  );
}

function main() {
  let parsedArgs;
  let bindAddress;

  try {
    bindAddress = getBindAddress();
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

  // Marp's bespoke template reads a numeric URL hash as the 1-based position
  // among rendered slides, which differs from the section id once a hidden
  // slide precedes the target.
  let slidePosition;

  try {
    slidePosition = resolveRequestedSlide(
      deckPath,
      configPath,
      displayedPage,
      repoRoot,
    )?.renderedSlide;
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const deckDir = path.dirname(deckPath);
  const marpBin = process.env.MARP_AGENT_MARP_BIN || getMarpBin(repoRoot);
  const marpArgs = ["--server", "--watch", "--config", configPath, deckDir];
  warnIfPublic(bindAddress);

  // Only an absent PORT opts into the implicit-candidate fallback; explicit
  // values, including empty or invalid ones, reach the child untouched.
  const implicitPort = process.env.PORT === undefined;
  let httpPort = DEFAULT_HTTP_PORT;

  let child;
  let opened = false;
  let notifierRetries = 0;

  const tryOpen = (line) => {
    if (opened) return;
    const match = line.match(/http:\/\/(?:\[[^\]]+\]|[^/\s]+):\d+/);
    if (!match) return;

    const urls = previewBaseUrls(bindAddress, new URL(match[0]).port).map(
      (baseUrl) => buildDeckUrl(baseUrl, deckPath, slidePosition),
    );
    const url = urls[0];
    const browser = openBrowser(url);
    browser?.unref();
    opened = true;
    process.stdout.write(`[preview] Opened ${url}\n`);
    for (const available of urls.slice(1))
      process.stdout.write(`[preview] Available ${available}\n`);
  };

  const start = () => {
    let outputTail = "";
    const observeLine = (line) => {
      outputTail = `${outputTail}${line}\n`.slice(-8192);
      tryOpen(line);
    };
    child = spawn(marpBin, marpArgs, {
      cwd: repoRoot,
      stdio: ["inherit", "pipe", "pipe"],
      env: {
        ...process.env,
        ...(implicitPort ? { PORT: String(httpPort) } : {}),
        MARP_AGENT_BIND_ADDRESS: bindAddress,
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require ${JSON.stringify(path.join(repoRoot, "src/marp-bind-preload.js"))}`,
      },
    });

    forwardLines(child.stdout, process.stdout, observeLine);
    forwardLines(child.stderr, process.stderr, observeLine);

    child.once("error", (error) => {
      console.error(`Error: failed to start ${marpBin}: ${error.message}`);
      process.exit(1);
    });

    // Wait for both output streams to flush before deciding whether to retry.
    child.on("close", (code, signal) => {
      if (signal) {
        process.exit(signal === "SIGINT" ? 130 : 143);
        return;
      }

      // Retry actual HTTP bind failures, including races after startup. Handle
      // mixed HTTP/notifier failures here without spending notifier retries.
      if (
        code !== 0 &&
        implicitPort &&
        isHttpPortConflict(outputTail, httpPort)
      ) {
        if (httpPort < LAST_HTTP_PORT) {
          const tried = httpPort;
          httpPort += 1;
          opened = false;
          process.stderr.write(
            `[preview] HTTP port ${tried} is already in use; trying ${httpPort} (${httpPort - DEFAULT_HTTP_PORT + 1}/${MAX_HTTP_PORT_ATTEMPTS})\n`,
          );
          start();
          return;
        }
        process.stderr.write(
          `[preview] HTTP ports ${DEFAULT_HTTP_PORT}-${LAST_HTTP_PORT} are all in use; giving up after ${MAX_HTTP_PORT_ATTEMPTS} attempts\n`,
        );
        process.exit(code ?? 1);
        return;
      }

      // The watch notifier picks a free port and binds it later without an
      // error handler, so concurrent starts can lose the race and crash with
      // EADDRINUSE. Respawning re-probes the port and converges on a free
      // one; a taken HTTP listen port is handled by the candidate fallback
      // above (or reported as-is when PORT was explicit) before this retry.
      if (
        code !== 0 &&
        isNotifierPortConflict(outputTail) &&
        notifierRetries < MAX_NOTIFIER_RETRIES
      ) {
        notifierRetries += 1;
        opened = false;
        process.stderr.write(
          `[preview] Marp watch notifier hit a port conflict; restarting (${notifierRetries}/${MAX_NOTIFIER_RETRIES})\n`,
        );
        setTimeout(start, NOTIFIER_RETRY_DELAY_MS);
        return;
      }

      process.exit(code ?? 1);
    });
  };

  // Signals must reach the current child across respawns; when no child is
  // alive (retry delay), stop the parent instead of swallowing the signal.
  forwardChildSignals({
    get killed() {
      return child === undefined;
    },
    kill(signal) {
      if (
        child === undefined ||
        child.exitCode !== null ||
        child.signalCode !== null
      ) {
        process.exit(signal === "SIGINT" ? 130 : 143);
        return;
      }

      child.kill(signal);
    },
  });

  start();
}

main();
