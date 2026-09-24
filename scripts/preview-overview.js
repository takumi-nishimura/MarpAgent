const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { marpCli } = require("@marp-team/marp-cli");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

const {
  buildOverviewUrl,
  parseDeckAndPageArgs,
} = require("../src/preview-cli");
const {
  buildOverviewDocument,
  buildWaitingDocument,
  getOverviewOutputPath,
} = require("../src/overview-preview");
const {
  openBrowser,
  resolveRequestedSlideId,
} = require("../src/preview-runtime");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "marp.config.js");
const themesDir = path.join(repoRoot, "themes");

enforceSupportedNodeRuntime();

function printUsage() {
  console.error("Usage: marpx <deck.md> [displayed-page] --overview");
  console.error(
    "The page is the number shown on the slide; decks without page numbers use the position among rendered slides.",
  );
}

function getReloadToken(outputPath) {
  try {
    const stat = fs.statSync(outputPath);
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return "missing";
  }
}

function removeOutputFile(outputPath) {
  try {
    fs.rmSync(outputPath, { force: true });
  } catch {
    // Ignore cleanup failures for generated preview output.
  }
}

function getRenderingPath(outputPath) {
  // Keep the .html extension so Marp CLI still emits HTML.
  return outputPath.replace(/\.html$/, `.rendering-${process.pid}.html`);
}

// Render the deck once in-process and publish the result with a rename, so
// the server never reads a half-written overview and a failed render keeps
// the previous output. Rendering in-process instead of `marp --watch` also
// avoids Marp's watch-notifier WebSocket server, which the overview does not
// use and which crashes with EADDRINUSE when another `marp --watch` process
// picks the same port at the same time.
async function renderDeck({ configPath, deckPath, outputPath }) {
  const renderingPath = getRenderingPath(outputPath);
  let exitCode;

  try {
    exitCode = await marpCli([
      "--config",
      configPath,
      deckPath,
      "-o",
      renderingPath,
    ]);
  } catch (error) {
    console.error(`[preview:overview] Render failed: ${error.message}`);
    exitCode = 1;
  }

  if (exitCode === 0 && fs.existsSync(renderingPath)) {
    try {
      fs.renameSync(renderingPath, outputPath);
      return true;
    } catch (error) {
      console.error(`[preview:overview] Cannot publish render: ${error.message}`);
    }
  }

  removeOutputFile(renderingPath);
  return false;
}

// Run `render` for every request, but never concurrently: requests made while
// a render is running collapse into one follow-up render, so the last save
// always wins.
function createRenderQueue(render) {
  let running;
  let pending = false;

  async function drain() {
    do {
      pending = false;
      try {
        await render();
      } catch (error) {
        console.error(`[preview:overview] Render failed: ${error.message}`);
      }
    } while (pending);
  }

  return {
    request() {
      if (running) {
        pending = true;
        return running;
      }
      running = drain().finally(() => {
        running = undefined;
      });
      return running;
    },
    idle() {
      return running ?? Promise.resolve();
    },
  };
}

// Watch directories rather than files so saves that replace the file (atomic
// rename by editors) keep being observed.
function watchDirectory(dirPath, isRelevant, onChange) {
  try {
    const watcher = fs.watch(dirPath, (_eventType, fileName) => {
      if (!fileName || isRelevant(fileName.toString())) onChange();
    });
    watcher.on("error", (error) => {
      console.error(`[preview:overview] Stopped watching ${dirPath}: ${error.message}`);
      watcher.close();
    });
    return watcher;
  } catch (error) {
    console.error(`[preview:overview] Cannot watch ${dirPath}: ${error.message}`);
    return undefined;
  }
}

function sendJson(response, payload) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(message);
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".gif":
      return "image/gif";
    case ".html":
      return "text/html; charset=utf-8";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".md":
      return "text/markdown; charset=utf-8";
    case ".mp4":
      return "video/mp4";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webm":
      return "video/webm";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function resolveStaticPath(deckDir, requestPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  const relativeRequestPath = decodedPath.replace(/^\/+/, "");
  const normalizedPath = path
    .normalize(relativeRequestPath)
    .replace(/^(\.\.[/\\])+/, "");
  const candidatePath = path.join(deckDir, normalizedPath);
  const relativePath = path.relative(deckDir, candidatePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return candidatePath;
}

function createServer({ deckDir, deckPath, outputPath, targetSlideId }) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");

    if (requestUrl.pathname === "/__marp_agent__/meta") {
      sendJson(response, { token: getReloadToken(outputPath) });
      return;
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      const reloadToken = getReloadToken(outputPath);
      const deckName = path.basename(deckPath);

      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });

      if (!fs.existsSync(outputPath)) {
        response.end(buildWaitingDocument(deckName, reloadToken));
        return;
      }

      const renderedHtml = fs.readFileSync(outputPath, "utf8");
      response.end(
        buildOverviewDocument(renderedHtml, { reloadToken, targetSlideId }),
      );
      return;
    }

    const filePath = resolveStaticPath(deckDir, requestUrl.pathname);

    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      sendText(response, 404, "Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": getMimeType(filePath),
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(response);
  });

  return server;
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

  let targetSlideId;

  try {
    targetSlideId = resolveRequestedSlideId(
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
  const deckFileName = path.basename(deckPath);
  const outputPath = getOverviewOutputPath(deckPath);
  const server = createServer({
    deckDir,
    deckPath,
    outputPath,
    targetSlideId,
  });
  const watchers = [];

  function shutdown(exitCode) {
    watchers.forEach((watcher) => watcher.close());
    server.close();
    removeOutputFile(outputPath);
    removeOutputFile(getRenderingPath(outputPath));
    process.exit(exitCode);
  }

  process.on("SIGINT", () => shutdown(130));
  process.on("SIGTERM", () => shutdown(143));

  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      console.error("Failed to determine overview preview address.");
      process.exit(1);
    }

    const url = buildOverviewUrl(
      `http://127.0.0.1:${address.port}`,
      targetSlideId,
    );
    let opened = false;

    // Open the browser only after the first successful render so the user
    // sees the overview immediately instead of a "Rendering…" splash. The
    // log line doubles as the readiness signal for scripts and tests.
    const queue = createRenderQueue(async () => {
      const rendered = await renderDeck({ configPath, deckPath, outputPath });
      if (!rendered || opened) return;
      opened = true;
      const browser = openBrowser(url);
      browser?.unref();
      process.stdout.write(`[preview:overview] Opened ${url}\n`);
    });
    const requestRender = () => {
      queue.request();
    };

    // Start watching before the first render so a save made while it runs
    // still triggers a follow-up render.
    watchers.push(
      ...[
        watchDirectory(deckDir, (fileName) => fileName === deckFileName, requestRender),
        watchDirectory(themesDir, (fileName) => fileName.endsWith(".css"), requestRender),
      ].filter(Boolean),
    );
    requestRender();
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  createRenderQueue,
  createServer,
  renderDeck,
};
