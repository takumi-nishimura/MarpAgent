const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  buildRenderedToMarkdownMap,
  detectHiddenSlides,
  measureVisualOverflow,
} = require("../../src/visual-overflow");

function fixture(name) {
  return path.join(__dirname, "../..", "fixtures", name);
}

test("detectHiddenSlides finds slides with hide directive", () => {
  const markdown = `---
marp: true
---

# Slide 1

---

<!-- hide: true -->
# Hidden Slide

---

# Slide 3
`;

  const hidden = detectHiddenSlides(markdown);
  assert.equal(hidden.size, 1);
  assert.equal(hidden.has(2), true);
  assert.equal(hidden.has(1), false);
  assert.equal(hidden.has(3), false);
});

test("detectHiddenSlides returns empty set when no hidden slides", () => {
  const markdown = `---
marp: true
---

# Slide 1

---

# Slide 2
`;

  const hidden = detectHiddenSlides(markdown);
  assert.equal(hidden.size, 0);
});

test("buildRenderedToMarkdownMap maps rendered indices to markdown slide numbers", () => {
  const markdown = `---
marp: true
---

# Slide 1

---

<!-- hide: true -->
# Hidden

---

# Slide 3

---

# Slide 4
`;

  const map = buildRenderedToMarkdownMap(markdown);
  // Rendered sections: 0 -> slide 1, 1 -> slide 3, 2 -> slide 4
  assert.equal(map[0], 1);
  assert.equal(map[1], 3);
  assert.equal(map[2], 4);
  assert.equal(map.length, 3);
});

test("buildRenderedToMarkdownMap skips empty slides", () => {
  const markdown = `---
marp: true
---

# Slide 1

---

---

# Slide 3
`;

  const map = buildRenderedToMarkdownMap(markdown);
  assert.equal(map[0], 1);
  assert.equal(map[1], 3);
  assert.equal(map.length, 2);
});

test("measureVisualOverflow detects overflow on heavy slide", async () => {
  const deckPath = fixture("overflow-heavy-slide.md");
  const results = await measureVisualOverflow(deckPath);

  assert.equal(results.length > 0, true, "Should detect at least one overflow");
  assert.equal(results[0].slideNumber, 1);
  assert.equal(results[0].overflowPx > 0, true);
  assert.equal(typeof results[0].scrollHeight, "number");
  assert.equal(typeof results[0].clientHeight, "number");
});

test("measureVisualOverflow returns empty for clean slide", async () => {
  const deckPath = fixture("clean-slide.md");
  const results = await measureVisualOverflow(deckPath);

  assert.equal(results.length, 0, "Clean slide should not overflow");
});
