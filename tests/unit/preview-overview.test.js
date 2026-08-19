const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { createServer } = require("../../scripts/preview-overview");

function listenOnFreePort(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
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
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            body,
            headers: response.headers,
            statusCode: response.statusCode,
          });
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

function createFixture() {
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "overview-server-test-"));
  const outputPath = path.join(tmpDir, "output.html");
  const deckPath = path.join(tmpDir, "slide.md");
  fs.writeFileSync(deckPath, "---\n---\n# Slide 1");
  return { deckPath, outputPath, tmpDir };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

test("metadata reports missing output without caching", async () => {
  const fixture = createFixture();
  const server = createServer({
    deckDir: fixture.tmpDir,
    deckPath: fixture.deckPath,
    outputPath: fixture.outputPath,
    targetSlideId: undefined,
  });

  try {
    const port = await listenOnFreePort(server);
    const response = await requestPath(port, "/__marp_agent__/meta");

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.deepEqual(JSON.parse(response.body), { token: "missing" });
  } finally {
    await closeServer(server);
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

test("metadata token changes when rendered output changes", async () => {
  const fixture = createFixture();
  fs.writeFileSync(fixture.outputPath, "initial");
  const server = createServer({
    deckDir: fixture.tmpDir,
    deckPath: fixture.deckPath,
    outputPath: fixture.outputPath,
    targetSlideId: undefined,
  });

  try {
    const port = await listenOnFreePort(server);
    const initial = await requestPath(port, "/__marp_agent__/meta");
    fs.writeFileSync(fixture.outputPath, "updated output");
    const updated = await requestPath(port, "/__marp_agent__/meta");

    assert.notEqual(
      JSON.parse(updated.body).token,
      JSON.parse(initial.body).token,
    );
  } finally {
    await closeServer(server);
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

test("overview page reports its current token without caching", async () => {
  const fixture = createFixture();
  fs.writeFileSync(
    fixture.outputPath,
    [
      "<!doctype html>",
      "<html><head><title>Deck</title></head><body>",
      '<div id=":$p"><svg data-marpit-svg="" viewBox="0 0 1280 720">',
      '<foreignObject><section id="1">Slide 1</section></foreignObject>',
      "</svg></div></body></html>",
    ].join(""),
  );
  const server = createServer({
    deckDir: fixture.tmpDir,
    deckPath: fixture.deckPath,
    outputPath: fixture.outputPath,
    targetSlideId: undefined,
  });

  try {
    const port = await listenOnFreePort(server);
    const metadata = await requestPath(port, "/__marp_agent__/meta");
    const overview = await requestPath(port, "/");
    const token = JSON.parse(metadata.body).token;

    assert.equal(overview.statusCode, 200);
    assert.equal(overview.headers["cache-control"], "no-store");
    assert.match(overview.body, new RegExp(`data-reload-token="${token}"`));
    assert.match(overview.body, /Slide 1/);
  } finally {
    await closeServer(server);
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

test("malformed URL-encoded path returns 404 and server stays available", async () => {
  const fixture = createFixture();
  fs.writeFileSync(fixture.outputPath, "<html>test</html>");
  const server = createServer({
    deckDir: fixture.tmpDir,
    deckPath: fixture.deckPath,
    outputPath: fixture.outputPath,
    targetSlideId: undefined,
  });

  try {
    const port = await listenOnFreePort(server);
    const malformed = await requestPath(port, "/%E0%A4%A");
    const health = await requestPath(port, "/__marp_agent__/meta");

    assert.equal(malformed.statusCode, 404);
    assert.equal(health.statusCode, 200);
  } finally {
    await closeServer(server);
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});

test("removed WebSocket endpoint is not served", async () => {
  const fixture = createFixture();
  fs.writeFileSync(fixture.outputPath, "<html>test</html>");
  const server = createServer({
    deckDir: fixture.tmpDir,
    deckPath: fixture.deckPath,
    outputPath: fixture.outputPath,
    targetSlideId: undefined,
  });

  try {
    const port = await listenOnFreePort(server);
    const response = await requestPath(port, "/__marp_agent__/ws");

    assert.equal(response.statusCode, 404);
  } finally {
    await closeServer(server);
    fs.rmSync(fixture.tmpDir, { recursive: true, force: true });
  }
});
