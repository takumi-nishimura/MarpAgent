const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  extractSlidePageMap,
  findSlideIdByDisplayedPage,
} = require("../../src/marp-pagination");

const repoRoot = path.join(__dirname, "../..");
const configPath = path.join(repoRoot, "marp.config.js");
const paginationFixtureDeckPath = path.join(
  repoRoot,
  "fixtures",
  "paginate-skip-slide.md",
);

test("extractSlidePageMap skips slides without displayed pagination", () => {
  const html = [
    '<section id="1" data-paginate="skip">',
    '<section id="2" data-marpit-pagination="1">',
    '<section id="3" data-marpit-pagination="2">',
  ].join("");

  assert.deepEqual(extractSlidePageMap(html), [
    { slideId: "2", displayedPage: 1 },
    { slideId: "3", displayedPage: 2 },
  ]);
});

test("findSlideIdByDisplayedPage accounts for paginate skip", () => {
  assert.deepEqual(
    findSlideIdByDisplayedPage(paginationFixtureDeckPath, configPath, 1),
    {
      slideId: "2",
      displayedPage: 1,
    },
  );
});
