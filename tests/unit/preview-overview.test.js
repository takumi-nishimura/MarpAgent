const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const {
  acceptWebSocket,
  createServer,
  sendWebSocketMessage,
} = require("../../scripts/preview-overview");

function listenOnFreePort(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function connectWs(port, wsPath = "/") {
  return new Promise((resolve) => {
    const key = crypto.randomBytes(16).toString("base64");
    const client = net.connect(port, "127.0.0.1", () => {
      client.write(
        `GET ${wsPath} HTTP/1.1\r\n` +
          "Host: 127.0.0.1\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Key: ${key}\r\n` +
          "Sec-WebSocket-Version: 13\r\n" +
          "\r\n",
      );
      resolve(client);
    });
  });
}

function requestPath(port, requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: requestPath,
        method: "GET",
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      },
    );
    request.on("error", reject);
    request.end();
  });
}

// Collects data from socket until predicate is true or timeout.
function readUntil(socket, predicate, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timer = setTimeout(() => {
      socket.removeListener("data", onData);
      reject(new Error("readUntil timed out"));
    }, timeoutMs);
    function onData(data) {
      buffer = Buffer.concat([buffer, data]);
      if (predicate(buffer)) {
        clearTimeout(timer);
        socket.removeListener("data", onData);
        resolve(buffer);
      }
    }
    socket.on("data", onData);
  });
}

function hasWsFrame(buf) {
  const sep = Buffer.from("\r\n\r\n");
  const hdrEnd = buf.indexOf(sep);
  return hdrEnd !== -1 && buf.length >= hdrEnd + sep.length + 2;
}

function parseWsFrame(buf) {
  const hdrEnd = buf.indexOf(Buffer.from("\r\n\r\n")) + 4;
  const frame = buf.slice(hdrEnd);
  assert.equal(frame[0], 0x81, "FIN + text opcode");
  const payloadLen = frame[1] & 0x7f;
  return frame.slice(2, 2 + payloadLen).toString();
}

// --- acceptWebSocket ---

test("acceptWebSocket completes handshake with valid key", async () => {
  const server = http.createServer();
  const sockets = [];

  server.on("upgrade", (req, socket) => {
    const ws = acceptWebSocket(req, socket);
    assert.ok(ws);
    sockets.push(ws);
  });

  const port = await listenOnFreePort(server);
  const client = await connectWs(port);
  const data = await readUntil(client, (b) =>
    b.toString().includes("\r\n\r\n"),
  );

  assert.match(data.toString(), /^HTTP\/1\.1 101/);
  assert.match(data.toString(), /Sec-WebSocket-Accept:/);

  client.destroy();
  sockets.forEach((s) => s.destroy());
  await new Promise((resolve) => server.close(resolve));
});

test("acceptWebSocket destroys socket when key is missing", async () => {
  const server = http.createServer();

  server.on("upgrade", (req, socket) => {
    delete req.headers["sec-websocket-key"];
    const result = acceptWebSocket(req, socket);
    assert.equal(result, null);
  });

  const port = await listenOnFreePort(server);
  const client = await connectWs(port);
  await new Promise((resolve) => client.on("close", resolve));
  await new Promise((resolve) => server.close(resolve));
});

// --- sendWebSocketMessage ---

test("sendWebSocketMessage sends a valid text frame", async () => {
  const server = http.createServer();
  const sockets = [];

  server.on("upgrade", (req, socket) => {
    const ws = acceptWebSocket(req, socket);
    sockets.push(ws);
    sendWebSocketMessage(ws, '{"type":"reload"}');
  });

  const port = await listenOnFreePort(server);
  const client = await connectWs(port);

  const buffer = await readUntil(client, hasWsFrame);
  const payload = parseWsFrame(buffer);
  assert.equal(payload, '{"type":"reload"}');

  client.destroy();
  sockets.forEach((s) => s.destroy());
  await new Promise((resolve) => server.close(resolve));
});

// --- createServer WebSocket integration ---

test("createServer notifies WebSocket clients on file change", async () => {
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "ws-test-"));
  const outputPath = path.join(tmpDir, "output.html");
  const deckPath = path.join(tmpDir, "slide.md");
  fs.writeFileSync(outputPath, "<html>initial</html>");
  fs.writeFileSync(deckPath, "---\n---\n# Slide 1");

  const server = createServer({
    deckDir: tmpDir,
    deckPath,
    outputPath,
    targetSlideId: undefined,
  });

  const port = await listenOnFreePort(server);
  const client = await connectWs(port, "/__marp_agent__/ws");

  // Schedule file change so the WS frame arrives after handshake.
  setTimeout(() => {
    fs.writeFileSync(outputPath, "<html>updated</html>");
  }, 300);

  const buffer = await readUntil(client, hasWsFrame, 5000);
  const payload = parseWsFrame(buffer);
  assert.equal(JSON.parse(payload).type, "reload");

  client.destroy();
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("createServer notifies late WebSocket client when file already changed", async () => {
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "ws-test-"));
  const outputPath = path.join(tmpDir, "output.html");
  const deckPath = path.join(tmpDir, "slide.md");
  // Output does NOT exist yet (simulates waiting for first render).
  fs.writeFileSync(deckPath, "---\n---\n# Slide 1");

  const server = createServer({
    deckDir: tmpDir,
    deckPath,
    outputPath,
    targetSlideId: undefined,
  });

  const port = await listenOnFreePort(server);

  // Create the output file BEFORE the WebSocket client connects.
  fs.writeFileSync(outputPath, "<html>rendered</html>");

  // Give fs.watch time to fire and notify (no clients yet).
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Now connect the WebSocket client — it should get an immediate reload.
  const client = await connectWs(port, "/__marp_agent__/ws");
  const buffer = await readUntil(client, hasWsFrame, 3000);
  const payload = parseWsFrame(buffer);
  assert.equal(JSON.parse(payload).type, "reload");

  client.destroy();
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("createServer rejects WebSocket on wrong path", async () => {
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "ws-test-"));
  const outputPath = path.join(tmpDir, "output.html");
  const deckPath = path.join(tmpDir, "slide.md");
  fs.writeFileSync(outputPath, "<html>test</html>");
  fs.writeFileSync(deckPath, "---\n---\n# Slide 1");

  const server = createServer({
    deckDir: tmpDir,
    deckPath,
    outputPath,
    targetSlideId: undefined,
  });

  const port = await listenOnFreePort(server);
  const client = await connectWs(port, "/bad-path");
  await new Promise((resolve) => client.on("close", resolve));

  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("createServer returns 404 for malformed URL-encoded path and stays alive", async () => {
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "ws-test-"));
  const outputPath = path.join(tmpDir, "output.html");
  const deckPath = path.join(tmpDir, "slide.md");
  fs.writeFileSync(outputPath, "<html>test</html>");
  fs.writeFileSync(deckPath, "---\n---\n# Slide 1");

  const server = createServer({
    deckDir: tmpDir,
    deckPath,
    outputPath,
    targetSlideId: undefined,
  });

  const port = await listenOnFreePort(server);
  const malformedStatus = await requestPath(port, "/%E0%A4%A");
  assert.equal(malformedStatus, 404);

  const healthStatus = await requestPath(port, "/__marp_agent__/meta");
  assert.equal(healthStatus, 200);

  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("createServer survives fs.watch error events", async () => {
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "ws-test-"));
  const outputPath = path.join(tmpDir, "output.html");
  const deckPath = path.join(tmpDir, "slide.md");
  fs.writeFileSync(outputPath, "<html>test</html>");
  fs.writeFileSync(deckPath, "---\n---\n# Slide 1");

  const originalWatch = fs.watch;
  const fakeWatcher = new EventEmitter();
  fakeWatcher.close = () => {};
  fs.watch = () => fakeWatcher;

  const server = createServer({
    deckDir: tmpDir,
    deckPath,
    outputPath,
    targetSlideId: undefined,
  });

  try {
    const port = await listenOnFreePort(server);
    fakeWatcher.emit("error", new Error("EMFILE"));

    const status = await requestPath(port, "/__marp_agent__/meta");
    assert.equal(status, 200);
  } finally {
    fs.watch = originalWatch;
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
