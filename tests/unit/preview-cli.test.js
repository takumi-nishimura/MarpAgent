const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildDeckUrl,
  buildOverviewUrl,
  parseDeckAndPageArgs,
} = require("../../src/preview-cli");

const repoRoot = path.join(__dirname, "..");
const defaultDeckPath = path.join(repoRoot, "decks", "example", "slide.md");

test("parseDeckAndPageArgs defaults to the example deck", () => {
  assert.deepEqual(
    parseDeckAndPageArgs([], { repoRoot, defaultDeckPath }),
    { deckPath: defaultDeckPath },
  );
});

test("parseDeckAndPageArgs accepts a displayed page shortcut", () => {
  assert.deepEqual(
    parseDeckAndPageArgs(["12"], { repoRoot, defaultDeckPath }),
    { deckPath: defaultDeckPath, displayedPage: 12 },
  );
});

test("parseDeckAndPageArgs resolves explicit deck paths", () => {
  assert.deepEqual(
    parseDeckAndPageArgs(["decks/example/slide.md", "3"], {
      repoRoot,
      defaultDeckPath,
    }),
    { deckPath: defaultDeckPath, displayedPage: 3 },
  );
});

test("buildDeckUrl targets the deck route and hash", () => {
  assert.equal(
    buildDeckUrl("http://localhost:8080", defaultDeckPath, "4"),
    "http://localhost:8080/slide.md#4",
  );
});

test("buildOverviewUrl encodes the target slide id in the query string", () => {
  assert.equal(
    buildOverviewUrl("http://127.0.0.1:9000", "deck/7"),
    "http://127.0.0.1:9000/?slide=deck%2F7",
  );
});
