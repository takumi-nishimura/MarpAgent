const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

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
  forwardChildSignals,
  forwardLines,
  getMarpBin,
  openBrowser,
  resolveRequestedSlideId,
} = require("../src/preview-runtime");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "marp.config.js");

function printUsage() {
  console.error("Usage: npm run preview:overview -- <deck.md> [displayed-page]");
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

function acceptWebSocket(request, socket) {
  const key = request.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return null;
  }

  const accept = crypto
    .createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-5AB9FFC115E3")
    .digest("base64");

  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      "\r\n",
  );

  return socket;
}

function sendWebSocketMessage(socket, message) {
  const payload = Buffer.from(message, "utf8");
  const header = [0x81]; // FIN + text opcode

  if (payload.length < 126) {
    header.push(payload.length);
  } else if (payload.length < 65536) {
    header.push(126, (payload.length >> 8) & 0xff, payload.length & 0xff);
  }

  try {
    socket.write(Buffer.concat([Buffer.from(header), payload]));
  } catch {
    // Client disconnected.
  }
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
  const wsClients = new Set();
  let lastToken = getReloadToken(outputPath);

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

  server.on("upgrade", (request, socket) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    if (requestUrl.pathname !== "/__marp_agent__/ws") {
      socket.destroy();
      return;
    }

    const ws = acceptWebSocket(request, socket);
    if (!ws) return;

    wsClients.add(ws);
    ws.on("close", () => wsClients.delete(ws));
    ws.on("error", () => wsClients.delete(ws));

    // If the file changed before this client connected (e.g. the initial
    // render completed before the browser's WebSocket was ready), notify
    // the new client immediately so the waiting page transitions.
    const currentToken = getReloadToken(outputPath);
    if (currentToken !== lastToken) {
      lastToken = currentToken;
      sendWebSocketMessage(ws, JSON.stringify({ type: "reload" }));
    }
  });

  function notifyClients() {
    const currentToken = getReloadToken(outputPath);
    if (currentToken === lastToken) return;
    // Only advance lastToken when there are connected clients.  If no
    // clients are present the stale token is kept so that the next client
    // to connect will see the mismatch in the upgrade handler and get an
    // immediate reload notification.
    if (wsClients.size === 0) return;
    lastToken = currentToken;

    for (const client of wsClients) {
      sendWebSocketMessage(client, JSON.stringify({ type: "reload" }));
    }
  }

  let watcher = null;
  let debounceTimer = null;

  try {
    const targetBasename = path.basename(outputPath);
    watcher = fs.watch(path.dirname(outputPath), (_event, filename) => {
      // filename can be null on some platforms; notify unconditionally in that
      // case so the token-based check inside notifyClients decides.
      if (filename == null || filename === targetBasename) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(notifyClients, 50);
      }
    });
    watcher.on("error", () => {
      watcher?.close();
      watcher = null;
    });
  } catch {
    // Fallback: clients will still use polling if fs.watch is unavailable.
  }

  const originalClose = server.close.bind(server);
  server.close = function close(callback) {
    watcher?.close();
    for (const client of wsClients) {
      client.destroy();
    }
    wsClients.clear();
    return originalClose(callback);
  };

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
  const outputPath = getOverviewOutputPath(deckPath);
  const marpBin = getMarpBin(repoRoot);
  const child = spawn(
    marpBin,
    ["--watch", "--config", configPath, deckPath, "-o", outputPath],
    {
      cwd: repoRoot,
      stdio: ["inherit", "pipe", "pipe"],
    },
  );

  forwardLines(child.stdout, process.stdout);
  forwardLines(child.stderr, process.stderr);
  forwardChildSignals(child);

  const server = createServer({
    deckDir,
    deckPath,
    outputPath,
    targetSlideId,
  });

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

    // Wait for the first render before opening the browser so the user
    // sees the overview immediately instead of a "Rendering…" splash.
    function tryOpen() {
      if (fs.existsSync(outputPath)) {
        const browser = openBrowser(url);
        browser?.unref();
        process.stdout.write(`[preview:overview] Opened ${url}\n`);
        return;
      }
      setTimeout(tryOpen, 50);
    }
    tryOpen();
  });

  child.on("exit", (code, signal) => {
    server.close();
    removeOutputFile(outputPath);

    if (signal) {
      process.exit(signal === "SIGINT" ? 130 : 143);
      return;
    }

    process.exit(code ?? 1);
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  acceptWebSocket,
  createServer,
  sendWebSocketMessage,
};
