const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const { stripVTControlCharacters } = require("node:util");

const { findSlideIdByDisplayedPage } = require("./marp-pagination");

function getMarpBin(repoRoot) {
  return (
    process.env.MARP_AGENT_MARP_BIN ||
    path.join(
      repoRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "marp.cmd" : "marp",
    )
  );
}

function openBrowser(
  url,
  { env = process.env, spawn: spawnBrowser = spawn, warn = console.warn } = {},
) {
  if (env.MARP_AGENT_NO_OPEN === "1") {
    return null;
  }

  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawnBrowser(command, args, {
    stdio: "ignore",
    detached: true,
  });
  const failed = (reason) =>
    warn(
      `[preview] Cannot open browser (${command}: ${reason}). Open ${url} manually; MARP_AGENT_NO_OPEN=1 disables automatic opening.`,
    );
  child.once("error", (error) => failed(error.message));
  child.once("exit", (code) => {
    if (code) failed(`exit ${code}`);
  });
  return child;
}

function forwardLines(stream, writer, onLine = () => {}) {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => {
    writer.write(`${line}\n`);
    onLine(line);
  });
}

/**
 * Resolve a serve/overview page argument through the slide map. Returns
 * undefined when no page was requested, or the resolved slide
 * ({ slideId, displayedPage, slide, renderedSlide }); throws when no rendered
 * slide matches.
 */
function resolveRequestedSlide(deckPath, configPath, displayedPage, repoRoot) {
  if (displayedPage === undefined) {
    return undefined;
  }

  const resolved = findSlideIdByDisplayedPage(
    deckPath,
    configPath,
    displayedPage,
  );

  if (!resolved) {
    throw new Error(
      `Displayed page ${displayedPage} was not found in ${path.relative(
        repoRoot,
        deckPath,
      )}.`,
    );
  }

  return resolved;
}

function resolveRequestedSlideId(
  deckPath,
  configPath,
  displayedPage,
  repoRoot,
) {
  return resolveRequestedSlide(deckPath, configPath, displayedPage, repoRoot)
    ?.slideId;
}

function forwardChildSignals(child) {
  const forwardSignal = (signal) => {
    if (!child.killed) child.kill(signal);
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));
}

// The watch notifier probes a port from 37717, then binds without an error
// handler. Concurrent starts can crash with raw EADDRINUSE; HTTP listen
// failures instead produce Marp's handled "Listen port" diagnostic.
function isNotifierPortConflict(output) {
  return /EADDRINUSE/.test(output);
}

// Match the attempted HTTP port in Marp's handled bind-failure diagnostic,
// allowing ANSI styling, forwarded line wraps, and continuation indentation.
function isHttpPortConflict(output, attemptedPort) {
  const plain = stripVTControlCharacters(output);
  const pattern = new RegExp(
    `\\bListen\\s+port\\s+${attemptedPort}\\s+is\\s+already\\s+used\\s+in\\s+the\\s+other\\s+process\\b`,
  );
  return pattern.test(plain);
}

module.exports = {
  forwardChildSignals,
  forwardLines,
  getMarpBin,
  isHttpPortConflict,
  isNotifierPortConflict,
  openBrowser,
  resolveRequestedSlide,
  resolveRequestedSlideId,
};
