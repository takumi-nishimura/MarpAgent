const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { createSharedAssetsHandler } = require("../../src/shared-assets-http");

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-shared-http-"));
  const deck = path.join(root, "decks/talk");
  fs.mkdirSync(deck, { recursive: true });
  fs.mkdirSync(path.join(root, "assets/css"), { recursive: true });
  fs.writeFileSync(path.join(root, "assets/logo.svg"), "global");
  fs.writeFileSync(
    path.join(root, "assets/css/site.css"),
    "a{background:url(../logo.svg)}",
  );
  fs.writeFileSync(path.join(root, "private.txt"), "private");
  const handler = createSharedAssetsHandler(deck);
  const server = http.createServer((req, res) => {
    if (!handler(req, res)) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, deck, url: `http://127.0.0.1:${server.address().port}` };
}

test("HTTP preview serves virtual shared resources and dependent CSS without source writes", async (t) => {
  const { root, deck, url } = await fixture(t);
  const logo = await fetch(`${url}/shared/logo.svg?version=1`);
  assert.equal(logo.status, 200);
  assert.match(logo.headers.get("content-type"), /image\/svg/);
  assert.equal(logo.headers.get("cache-control"), "no-store");
  assert.equal(await logo.text(), "global");
  assert.equal(
    await (await fetch(`${url}/shared/css/site.css`)).text(),
    "a{background:url(../logo.svg)}",
  );
  assert.equal(fs.existsSync(path.join(deck, "shared")), false);
  assert.equal(
    fs.readFileSync(path.join(root, "assets/logo.svg"), "utf8"),
    "global",
  );
});

test("physical shared is authoritative and missing files never fall back", async (t) => {
  const { deck, url } = await fixture(t);
  fs.mkdirSync(path.join(deck, "shared"));
  fs.writeFileSync(path.join(deck, "shared/local.svg"), "local");
  assert.equal((await fetch(`${url}/shared/logo.svg`)).status, 404);
  assert.equal(await (await fetch(`${url}/shared/local.svg`)).text(), "local");
});

test("HTTP shared routes reject encoded traversal and Windows alternate streams", async (t) => {
  const { url } = await fixture(t);
  for (const name of [
    "%2e%2e%2fprivate.txt",
    "%2e%2e%5cprivate.txt",
    "%00.svg",
    "logo.svg%3Astream",
  ]) {
    const result = await fetch(`${url}/shared/${name}`);
    assert.equal(result.status, 404, name);
    assert.ok(!(await result.text()).includes("private"));
  }
});

test("the shared handler delegates malformed and unrelated request URLs", () => {
  const handler = createSharedAssetsHandler(__dirname);
  assert.equal(handler({ url: "http://[", method: "GET" }, {}), false);
  assert.equal(handler({ url: "/slide.md", method: "GET" }, {}), false);
});

test("HTTP shared routes never serve a linked file outside the source project", async (t) => {
  const { root, url } = await fixture(t);
  const outside = `${root}-private`;
  fs.writeFileSync(outside, "outside secret");
  t.after(() => fs.rmSync(outside, { force: true }));
  try {
    fs.symlinkSync(outside, path.join(root, "assets/outside"), "file");
  } catch (error) {
    if (process.platform === "win32" && error.code === "EPERM") {
      t.skip("Native symlink creation is unavailable.");
      return;
    }
    throw error;
  }
  const response = await fetch(`${url}/shared/outside`);
  assert.equal(response.status, 404);
  assert.ok(!(await response.text()).includes("secret"));
});

test("shared resources support HEAD and byte ranges for media", async (t) => {
  const { url } = await fixture(t);
  const head = await fetch(`${url}/shared/logo.svg`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  const part = await fetch(`${url}/shared/logo.svg`, {
    headers: { Range: "bytes=1-3" },
  });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("content-range"), "bytes 1-3/6");
  assert.equal(await part.text(), "lob");
});

test("the preview token changes when shared content or the chosen directory changes", async (t) => {
  const { root, deck, url } = await fixture(t);
  await fetch(`${url}/shared/logo.svg`);
  const token = async () =>
    (await (await fetch(`${url}/__marpagent_shared__/version`)).json()).version;
  const first = await token();
  assert.match(first, /^[a-f\d]{64}$/);
  fs.writeFileSync(path.join(root, "assets/logo.svg"), "changed global");
  const second = await token();
  assert.notEqual(first, second);
  fs.mkdirSync(path.join(deck, "shared"));
  assert.notEqual(await token(), second);
});
