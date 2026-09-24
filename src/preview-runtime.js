const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");

const { findSlideIdByDisplayedPage } = require("./marp-pagination");

function getMarpBin(repoRoot) {
  return path.join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "marp.cmd" : "marp",
  );
}

function openBrowser(url) {
  if (process.env.MARP_AGENT_NO_OPEN === "1") {
    return null;
  }

  if (process.platform === "darwin") {
    return spawn("open", [url], { stdio: "ignore", detached: true });
  }

  if (process.platform === "win32") {
    return spawn("cmd", ["/c", "start", "", url], {
      stdio: "ignore",
      detached: true,
    });
  }

  return spawn("xdg-open", [url], { stdio: "ignore", detached: true });
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

  const resolved = findSlideIdByDisplayedPage(deckPath, configPath, displayedPage);

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

function resolveRequestedSlideId(deckPath, configPath, displayedPage, repoRoot) {
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

// Marp CLI's watch notifier probes a free port from 37717 and binds it later
// without error handling, so two watch/serve processes started together can
// crash with an unhandled EADDRINUSE on the WebSocketServer. Marp's own listen
// port failure is handled and reported as "Listen port ... is already used"
// without printing EADDRINUSE, so the raw error text only appears when the
// notifier crashed. Retrying is safe even when both appear: a retry that
// still finds the listen port taken exits with the handled error anyway.
function isNotifierPortConflict(output) {
  return /EADDRINUSE/.test(output);
}

module.exports = {
  forwardChildSignals,
  forwardLines,
  getMarpBin,
  isNotifierPortConflict,
  openBrowser,
  resolveRequestedSlide,
  resolveRequestedSlideId,
};
