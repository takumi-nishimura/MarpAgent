const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const {
  createRenderQueue,
  createServer,
  renderDeck,
} = require("../../scripts/preview-overview");

const repoRoot = path.resolve(__dirname, "../..");
const overviewScript = path.join(repoRoot, "scripts", "preview-overview.js");
const configPath = path.join(repoRoot, "marp.config.js");

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

function writeDeck(deckPath, state) {
  fs.writeFileSync(
    deckPath,
    ["---", "marp: true", "theme: lab", "---", "", `# ${state}`, ""].join("\n"),
  );
}

function createDeferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("render queue coalesces requests made while a render is running", async () => {
  const calls = [];
  const inFlight = [];
  const queue = createRenderQueue(async () => {
    const deferred = createDeferred();
    calls.push(calls.length + 1);
    inFlight.push(deferred);
    await deferred.promise;
  });

  const first = queue.request();
  queue.request();
  queue.request();
  assert.equal(calls.length, 1);

  inFlight[0].resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 2);

  inFlight[1].resolve();
  await first;
  await queue.idle();
  assert.equal(calls.length, 2);
});

test("renderDeck publishes the rendered deck and keeps it when a later render fails", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "overview-render-test-"));
  const deckPath = path.join(tmpDir, "slide.md");
  const outputPath = path.join(tmpDir, ".slide.overview.html");

  try {
    writeDeck(deckPath, "Rendered once");
    assert.equal(await renderDeck({ configPath, deckPath, outputPath }), true);
    const rendered = fs.readFileSync(outputPath, "utf8");
    assert.match(rendered, /Rendered once/);
    assert.deepEqual(
      fs.readdirSync(tmpDir).sort(),
      [".slide.overview.html", "slide.md"],
    );

    fs.rmSync(deckPath);
    assert.equal(await renderDeck({ configPath, deckPath, outputPath }), false);
    assert.equal(fs.readFileSync(outputPath, "utf8"), rendered);
    assert.deepEqual(fs.readdirSync(tmpDir), [".slide.overview.html"]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

function startOverview(deckPath) {
  const child = spawn(process.execPath, [overviewScript, deckPath], {
    cwd: repoRoot,
    env: { ...process.env, MARP_AGENT_NO_OPEN: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (chunk) => {
    log += chunk;
  });
  child.stderr.on("data", (chunk) => {
    log += chunk;
  });

  const opened = new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const match = log.match(/\[preview:overview\] Opened (http:\/\/\S+)/);
      if (match) {
        clearInterval(timer);
        resolve(new URL(match[1]));
      } else if (child.exitCode !== null) {
        clearInterval(timer);
        reject(new Error(`Overview exited before opening:\n${log}`));
      }
    }, 25);
  });

  return { child, getLog: () => log, opened };
}

async function stopOverview({ child }) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await exited;
}

async function waitForTokenChange(overview, url, previousToken) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    assert.equal(
      overview.child.exitCode,
      null,
      `Overview exited while watching:\n${overview.getLog()}`,
    );
    const response = await requestPath(url.port, "/__marp_agent__/meta");
    const { token } = JSON.parse(response.body);
    if (token !== previousToken) return token;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Token did not change:\n${overview.getLog()}`);
}

test("concurrent overview servers keep serving and following saves", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "overview-concurrent-test-"));
  const deckPaths = ["a", "b", "c"].map((name) => {
    const deckDir = path.join(tmpDir, name);
    fs.mkdirSync(deckDir);
    const deckPath = path.join(deckDir, "slide.md");
    writeDeck(deckPath, `Deck ${name} initial`);
    return deckPath;
  });
  const overviews = deckPaths.map((deckPath) => startOverview(deckPath));

  try {
    const urls = await Promise.all(overviews.map(({ opened }) => opened));
    const tokens = await Promise.all(
      urls.map(async (url) => {
        const response = await requestPath(url.port, "/__marp_agent__/meta");
        return JSON.parse(response.body).token;
      }),
    );

    deckPaths.forEach((deckPath, index) => writeDeck(deckPath, `Deck ${index} saved`));

    await Promise.all(
      overviews.map((overview, index) =>
        waitForTokenChange(overview, urls[index], tokens[index]),
      ),
    );
    for (const [index, url] of urls.entries()) {
      const page = await requestPath(url.port, "/");
      assert.match(page.body, new RegExp(`Deck ${index} saved`));
    }
  } finally {
    await Promise.all(overviews.map((overview) => stopOverview(overview)));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
