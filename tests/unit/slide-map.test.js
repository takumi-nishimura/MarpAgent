const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSlideMap,
  findSlideByDisplayedPage,
  formatSlideLabel,
} = require("../../src/slide-map");

function identities(markdown) {
  return buildSlideMap(markdown).map(({ raw, ...identity }) => identity);
}

test("buildSlideMap keeps empty slides, which Marp still renders", () => {
  const markdown = "# A\n\n---\n\n---\n\n# C\n";
  const map = buildSlideMap(markdown);

  assert.deepEqual(
    map.map((entry) => [entry.slide, entry.renderedSlide, entry.sectionId]),
    [
      [1, 1, "1"],
      [2, 2, "2"],
      [3, 3, "3"],
    ],
  );
  assert.equal(map[1].raw.trim(), "");
  assert.match(map[2].raw, /# C/);
});

test("buildSlideMap treats a setext underline as a heading, not a separator", () => {
  const markdown = "# A\n\n---\n\nSetext heading\n---\n\nBody\n\n---\n\n# C\n";
  const map = buildSlideMap(markdown);

  assert.equal(map.length, 3);
  assert.match(map[1].raw, /Setext heading\n---\n\nBody/);
  assert.equal(map[1].line, 4);
  assert.equal(map[2].slide, 3);
  assert.equal(map[2].line, 11);
});

test("buildSlideMap ignores --- inside fenced code", () => {
  const markdown = "# A\n\n```yaml\n---\nkey: value\n```\n\n---\n\n# B\n";
  const map = buildSlideMap(markdown);

  assert.equal(map.length, 2);
  assert.match(map[0].raw, /key: value/);
});

test("buildSlideMap reports hidden slides without a rendered position", () => {
  const markdown = `---
marp: true
paginate: true
---

# Page 1

---

<!-- _hide: true -->

# Hidden

---

# Page 2
`;

  assert.deepEqual(identities(markdown), [
    {
      slide: 1,
      renderedSlide: 1,
      sectionId: "1",
      page: 1,
      hidden: false,
      line: 5,
      endLine: 7,
    },
    {
      slide: 2,
      renderedSlide: null,
      sectionId: null,
      page: null,
      hidden: true,
      line: 9,
      endLine: 13,
    },
    {
      slide: 3,
      renderedSlide: 2,
      sectionId: "3",
      page: 2,
      hidden: false,
      line: 15,
      endLine: 17,
    },
  ]);
});

test("buildSlideMap reports displayed pages under skipped pagination", () => {
  const markdown = `---
paginate: true
---

<!-- _paginate: skip -->

# Cover

---

# Page 1

---

<!-- _paginate: hold -->

# Still page 1

---

<!-- paginate: false -->

# No page
`;
  const map = buildSlideMap(markdown);

  assert.deepEqual(
    map.map((entry) => entry.page),
    [null, 1, 1, null],
  );
  assert.equal(map[0].line, 4);
});

test("buildSlideMap follows headingDivider", () => {
  const markdown =
    "<!-- headingDivider: 2 -->\n\n# A\n\ntext\n\n## B\n\nmore\n";
  const map = buildSlideMap(markdown);

  assert.equal(map.length, 2);
  assert.equal(map[1].line, 7);
  assert.match(map[1].raw, /^## B/);
  assert.doesNotMatch(map[0].raw, /## B/);
});

test("findSlideByDisplayedPage resolves displayed pages and never hidden slides", () => {
  const markdown = `---
paginate: true
---

<!-- _paginate: skip -->

# Cover

---

<!-- _hide: true -->

# Hidden

---

# Page 1
`;
  const map = buildSlideMap(markdown);

  assert.equal(findSlideByDisplayedPage(map, 1).slide, 3);
  assert.equal(findSlideByDisplayedPage(map, 1).renderedSlide, 2);
  assert.equal(findSlideByDisplayedPage(map, 2), undefined);
});

test("findSlideByDisplayedPage falls back to rendered position without page numbers", () => {
  const markdown =
    "# A\n\n---\n\n<!-- _hide: true -->\n\n# Hidden\n\n---\n\n# C\n";
  const map = buildSlideMap(markdown);

  assert.equal(findSlideByDisplayedPage(map, 2).slide, 3);
  assert.equal(findSlideByDisplayedPage(map, 3), undefined);
});

test("formatSlideLabel shows the displayed page only when it differs", () => {
  assert.equal(
    formatSlideLabel({ slide: 11, page: 10, hidden: false }),
    "slide 11 (page 10)",
  );
  assert.equal(
    formatSlideLabel({ slide: 3, page: 3, hidden: false }),
    "slide 3",
  );
  assert.equal(
    formatSlideLabel({ slide: 1, page: null, hidden: false }),
    "slide 1",
  );
  assert.equal(
    formatSlideLabel({ slide: 24, page: null, hidden: true }),
    "slide 24 (hidden)",
  );
  assert.equal(formatSlideLabel({ slide: 2 }), "slide 2");
});
