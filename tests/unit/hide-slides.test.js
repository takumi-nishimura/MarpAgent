const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { Marp } = require("@marp-team/marp-core");

const configPath = path.join(__dirname, "../..", "marp.config.js");

// Render through the same engine factory the CLI loads from marp.config.js.
function renderWithConfig(markdown) {
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);
  const marp = new Marp({ html: config.html ?? true });
  const engine = config.engine({ marp }) || marp;
  return engine.render(markdown).html;
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? match[1] : undefined;
}

// Summarize each rendered slide section by its id, class, displayed page,
// page total, and header text. Only sections with an id are slides; the appended presenter
// script also mentions `<section`.
function renderedSlides(html) {
  const sections = html
    .split(/(?=<section\b)/)
    .filter((part) => /^<section\b[^>]*\sid="/.test(part));
  return sections.map((part) => {
    const tag = part.match(/^<section\b[^>]*>/)[0];
    const header = part.match(/<header>([\s\S]*?)<\/header>/);
    return {
      id: readAttribute(tag, "id"),
      className: readAttribute(tag, "class"),
      page: readAttribute(tag, "data-marpit-pagination"),
      total: readAttribute(tag, "data-marpit-pagination-total"),
      header: header ? header[1].trim() : undefined,
    };
  });
}

function deckWithHiddenSecondSlide(directive) {
  return `---
marp: true
paginate: true
---

<!-- class: lead -->
<!-- header: Deck header -->

# Slide 1

---

${directive}

# Slide 2

---

# Slide 3

---

# Slide 4
`;
}

for (const directive of ["<!-- hide: true -->", "<!-- _hide: true -->"]) {
  test(`${directive} hides only the slide that carries it`, () => {
    const html = renderWithConfig(deckWithHiddenSecondSlide(directive));

    assert.deepEqual(
      renderedSlides(html).map((slide) => slide.id),
      ["1", "3", "4"],
    );
    // The hidden slide's wrapper is removed whole, leaving no stray tags.
    assert.equal(html.match(/<svg\b/g).length, html.match(/<\/svg>/g).length);
  });

  test(`${directive} keeps inherited directives of the following slides`, () => {
    const visible = renderedSlides(
      renderWithConfig(deckWithHiddenSecondSlide("")),
    );
    const hidden = renderedSlides(
      renderWithConfig(deckWithHiddenSecondSlide(directive)),
    );

    const directivesOf = (slide) => ({
      id: slide.id,
      className: slide.className,
      header: slide.header,
    });
    assert.deepEqual(
      hidden.map(directivesOf),
      visible.filter((slide) => slide.id !== "2").map(directivesOf),
    );
    for (const slide of hidden) {
      assert.equal(slide.className, "lead");
      assert.equal(slide.header, "Deck header");
    }
  });

  test(`${directive} does not count the hidden slide toward page numbers`, () => {
    const slides = renderedSlides(
      renderWithConfig(deckWithHiddenSecondSlide(directive)),
    );

    assert.deepEqual(
      slides.map((slide) => [slide.page, slide.total]),
      [
        ["1", "3"],
        ["2", "3"],
        ["3", "3"],
      ],
    );
  });
}

test("a hidden last slide does not inflate the total after a skipped title", () => {
  // Same shape as a real deck: 25 slides, a `_paginate: skip` title slide,
  // and a `_hide: true` backup slide at the end.
  const bodySlides = Array.from(
    { length: 23 },
    (_, index) => `# Body ${index + 1}`,
  );
  const markdown = `---
marp: true
paginate: true
---

${[
  "<!-- _paginate: skip -->\n\n# Title",
  ...bodySlides,
  "<!-- _hide: true -->\n\n# Backup",
].join("\n\n---\n\n")}
`;

  const slides = renderedSlides(renderWithConfig(markdown));

  assert.equal(slides.length, 24);
  assert.deepEqual(
    [slides[0].page, slides[0].total],
    [undefined, undefined],
  );
  assert.deepEqual(
    [slides[1].page, slides[1].total],
    ["1", "23"],
  );
  assert.deepEqual(
    [slides[23].id, slides[23].page, slides[23].total],
    ["24", "23", "23"],
  );
});

test("hidden slides keep paginate skip and hold semantics of other slides", () => {
  const markdown = `---
marp: true
paginate: true
---

<!-- _paginate: skip -->

# Title

---

# Slide 2

---

<!-- _paginate: hold -->

# Slide 3

---

<!-- hide: true -->

# Hidden

---

# Slide 5
`;

  assert.deepEqual(
    renderedSlides(renderWithConfig(markdown)).map((slide) => [
      slide.id,
      slide.page,
      slide.total,
    ]),
    [
      ["1", undefined, undefined],
      ["2", "1", "2"],
      ["3", "1", "2"],
      ["5", "2", "2"],
    ],
  );
});

test("hide: false and hide comments inside code blocks keep the slide", () => {
  const markdown = `---
marp: true
---

<!-- hide: false -->

# Slide 1

---

\`\`\`md
<!-- hide: true -->
\`\`\`
`;

  assert.deepEqual(
    renderedSlides(renderWithConfig(markdown)).map((slide) => slide.id),
    ["1", "2"],
  );
});

test("hiding the last slide keeps the earlier slides", () => {
  const markdown = `---
marp: true
---

# Slide 1

---

# Slide 2

---

<!-- _hide: true -->

# Backup
`;

  assert.deepEqual(
    renderedSlides(renderWithConfig(markdown)).map((slide) => slide.id),
    ["1", "2"],
  );
});
