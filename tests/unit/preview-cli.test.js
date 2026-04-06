const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildDeckUrl,
  buildOverviewUrl,
  parseDeckAndPageArgs,
} = require("../../src/preview-cli");

const repoRoot = path.join(__dirname, "../..");
const fixtureDeckPath = path.join(repoRoot, "fixtures", "clean-slide.md");

test("parseDeckAndPageArgs requires a deck path", () => {
  assert.throws(() => parseDeckAndPageArgs([], { repoRoot }), /Deck path is required/);
});

test("parseDeckAndPageArgs rejects page-only shorthand", () => {
  assert.throws(
    () => parseDeckAndPageArgs(["12"], { repoRoot }),
    /Deck path is required before displayed page/,
  );
});

test("parseDeckAndPageArgs resolves explicit deck paths", () => {
  assert.deepEqual(
    parseDeckAndPageArgs(["fixtures/clean-slide.md", "3"], { repoRoot }),
    { deckPath: fixtureDeckPath, displayedPage: 3 },
  );
});

test("buildDeckUrl targets the deck route and hash", () => {
  assert.equal(
    buildDeckUrl("http://localhost:8080", fixtureDeckPath, "4"),
    "http://localhost:8080/clean-slide.md#4",
  );
});

test("buildOverviewUrl encodes the target slide id in the query string", () => {
  assert.equal(
    buildOverviewUrl("http://127.0.0.1:9000", "deck/7"),
    "http://127.0.0.1:9000/?slide=deck%2F7",
  );
});
