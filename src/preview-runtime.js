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

function resolveRequestedSlideId(deckPath, configPath, displayedPage, repoRoot) {
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

  return resolved.slideId;
}

function forwardChildSignals(child) {
  const forwardSignal = (signal) => {
    if (!child.killed) child.kill(signal);
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));
}

module.exports = {
  forwardChildSignals,
  forwardLines,
  getMarpBin,
  openBrowser,
  resolveRequestedSlideId,
};
