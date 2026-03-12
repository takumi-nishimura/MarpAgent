const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { PassThrough } = require("node:stream");

const {
  forwardChildSignals,
  forwardLines,
  getMarpBin,
  openBrowser,
  resolveRequestedSlideId,
} = require("../../src/preview-runtime");

const repoRoot = path.join(__dirname, "../..");

test("getMarpBin returns platform-appropriate binary path", () => {
  const bin = getMarpBin(repoRoot);
  const expected =
    process.platform === "win32" ? "marp.cmd" : "marp";

  assert.equal(path.basename(bin), expected);
  assert.ok(bin.includes(path.join("node_modules", ".bin")));
});

test("openBrowser returns null when MARP_AGENT_NO_OPEN is set", () => {
  const prev = process.env.MARP_AGENT_NO_OPEN;
  try {
    process.env.MARP_AGENT_NO_OPEN = "1";
    assert.equal(openBrowser("http://localhost:8080"), null);
  } finally {
    if (prev === undefined) delete process.env.MARP_AGENT_NO_OPEN;
    else process.env.MARP_AGENT_NO_OPEN = prev;
  }
});

test("forwardLines pipes each line to the writer and calls onLine", async () => {
  const input = new PassThrough();
  const chunks = [];
  const writer = { write(data) { chunks.push(data); } };
  const lines = [];

  forwardLines(input, writer, (line) => lines.push(line));

  input.write("alpha\nbeta\n");
  input.end();

  // Wait for readline to finish processing
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.deepEqual(lines, ["alpha", "beta"]);
  assert.ok(chunks.some((c) => c.includes("alpha")));
  assert.ok(chunks.some((c) => c.includes("beta")));
});

test("resolveRequestedSlideId returns undefined when displayedPage is undefined", () => {
  assert.equal(resolveRequestedSlideId("/fake", "/fake", undefined, repoRoot), undefined);
});

test("resolveRequestedSlideId throws when page is not found", () => {
  const deckPath = path.join(repoRoot, "decks", "example", "slide.md");
  const configPath = path.join(repoRoot, "marp.config.js");

  assert.throws(
    () => resolveRequestedSlideId(deckPath, configPath, 9999, repoRoot),
    /was not found/,
  );
});

test("resolveRequestedSlideId returns slide id for valid page", () => {
  const deckPath = path.join(repoRoot, "decks", "example", "slide.md");
  const configPath = path.join(repoRoot, "marp.config.js");

  const slideId = resolveRequestedSlideId(deckPath, configPath, 1, repoRoot);
  assert.equal(typeof slideId, "string");
  assert.ok(slideId.length > 0);
});

test("forwardChildSignals forwards SIGINT to child", () => {
  let signalSent = null;
  const fakeChild = {
    killed: false,
    kill(sig) {
      signalSent = sig;
    },
  };

  forwardChildSignals(fakeChild);

  // Emit SIGINT on current process — the handler should forward it
  process.emit("SIGINT");

  assert.equal(signalSent, "SIGINT");

  // Clean up listeners to avoid affecting other tests
  process.removeAllListeners("SIGINT");
  process.removeAllListeners("SIGTERM");
});
