const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { findSlideIdByDisplayedPage } = require("../../src/marp-pagination");

const repoRoot = path.join(__dirname, "../..");
const configPath = path.join(repoRoot, "marp.config.js");
const paginationFixtureDeckPath = path.join(
  repoRoot,
  "fixtures",
  "paginate-skip-slide.md",
);

test("findSlideIdByDisplayedPage accounts for paginate skip", () => {
  assert.deepEqual(
    findSlideIdByDisplayedPage(paginationFixtureDeckPath, configPath, 1),
    {
      slideId: "2",
      displayedPage: 1,
      slide: 2,
      renderedSlide: 2,
    },
  );
});

test("findSlideIdByDisplayedPage skips hidden slides", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-hide-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(
    deckPath,
    `---
marp: true
paginate: true
---

# Page 1

---

<!-- hide: true -->

# Hidden

---

# Page 2

---

<!-- _hide: true -->

# Hidden backup
`,
  );

  assert.deepEqual(findSlideIdByDisplayedPage(deckPath, configPath, 2), {
    slideId: "3",
    displayedPage: 2,
    slide: 3,
    renderedSlide: 2,
  });
  assert.equal(findSlideIdByDisplayedPage(deckPath, configPath, 3), undefined);
});

test("findSlideIdByDisplayedPage uses the rendered position without page numbers", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-nopage-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(
    deckPath,
    "# One\n\n---\n\n<!-- _hide: true -->\n\n# Hidden\n\n---\n\n# Three\n",
  );

  assert.deepEqual(findSlideIdByDisplayedPage(deckPath, configPath, 2), {
    slideId: "3",
    displayedPage: null,
    slide: 3,
    renderedSlide: 2,
  });
  assert.equal(findSlideIdByDisplayedPage(deckPath, configPath, 3), undefined);
});
