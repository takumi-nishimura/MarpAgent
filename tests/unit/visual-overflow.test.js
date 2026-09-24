const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildRenderedToMarkdownMap,
  detectHiddenSlides,
  measureRenderedSlides,
} = require("../../src/visual-overflow");
const { supportsVisualChecks } = require("./helpers/visual-support");

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

test("detectHiddenSlides treats hide and _hide as hiding only their own slide", () => {
  for (const directive of ["<!-- hide: true -->", "<!-- _hide: true -->"]) {
    const markdown = `---
marp: true
---

# Slide 1

---

${directive}
# Hidden Slide

---

# Slide 3

---

# Slide 4
`;

    assert.deepEqual([...detectHiddenSlides(markdown)], [2], directive);
  }
});

test("detectHiddenSlides reads hide from multi-key directive comments", () => {
  const markdown = `# Slide 1

---

<!--
_class: lead
_hide: true
-->
# Hidden Slide
`;

  assert.deepEqual([...detectHiddenSlides(markdown)], [2]);
});

test("detectHiddenSlides ignores hide false and hide comments in code blocks", () => {
  const markdown = `<!-- hide: false -->
# Slide 1

---

\`\`\`md
<!-- hide: true -->
\`\`\`
`;

  assert.equal(detectHiddenSlides(markdown).size, 0);
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

test("buildRenderedToMarkdownMap skips a slide hidden with _hide", () => {
  const markdown = `# Slide 1

---

<!-- _hide: true -->
# Hidden

---

# Slide 3
`;

  assert.deepEqual(buildRenderedToMarkdownMap(markdown), [1, 3]);
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

test("buildRenderedToMarkdownMap keeps --- inside fenced code in one slide", () => {
  const markdown = `---
marp: true
---

# Slide 1

\`\`\`md
---
\`\`\`
`;

  const map = buildRenderedToMarkdownMap(markdown);
  assert.equal(map.length, 1);
  assert.equal(map[0], 1);
});

test("measureRenderedSlides reports clipped text on the heavy fixture", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const result = await measureRenderedSlides(
    fixture("overflow-heavy-slide.md"),
  );

  assert.equal(result.status, "measured");
  assert.equal(result.slides.length, 1);
  const [slide] = result.slides;
  assert.equal(slide.slideNumber, 1);
  assert.equal(slide.maxOverflowPx > 0, true);
  assert.equal(slide.clipped[0].edge, "bottom");
  assert.match(slide.clipped[0].label, /^"Point twenty/);
});

test("measureRenderedSlides reports nothing for a clean slide", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const result = await measureRenderedSlides(fixture("clean-slide.md"));

  assert.equal(result.status, "measured");
  assert.deepEqual(
    result.slides.map((slide) => slide.clipped),
    [[]],
  );
  assert.deepEqual(
    result.slides.map((slide) => slide.overlaps),
    [[]],
  );
});

test("measureRenderedSlides ignores trailing margins and intentional crops", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-audit-"));
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(
    deckPath,
    `---
marp: true
theme: lab
---

# Trailing margin

<div style="height: 460px"></div>

<p style="margin: 0 0 200px">Last line fits; only its margin extends past the edge.</p>

---

# Cropped media

<div style="height: 200px; width: 300px; overflow: hidden">
<svg width="300" height="900" viewBox="0 0 300 900"><rect width="300" height="900" fill="#ccc"/></svg>
</div>

---

# Clipped text

<div style="height: 610px"></div>

This sentence starts near the bottom edge and is cut off.
`,
  );

  try {
    const result = await measureRenderedSlides(deckPath);

    assert.equal(result.status, "measured");
    const bySlide = Object.fromEntries(
      result.slides.map((slide) => [slide.slideNumber, slide.clipped]),
    );
    assert.deepEqual(bySlide[1], []);
    assert.deepEqual(bySlide[2], []);
    assert.equal(bySlide[3].length > 0, true);
    assert.match(bySlide[3][0].label, /This sentence/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measureRenderedSlides reports content crowding the slide edge", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-crowding-"));
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(
    deckPath,
    `---
marp: true
theme: lab
---

# Crowded bottom

<div style="height: 544px"></div>

<p style="margin: 0">This last line sits right above the bottom edge.</p>

---

# Footnotes and wide media

<div style="margin-right: -38px">
<svg width="1238" height="120" viewBox="0 0 1238 120"><rect width="1238" height="120" fill="#ddd"/></svg>
</div>

<div class="footnote">[1] Theme footnote placed at the bottom edge.</div>

---

# Clean

Plenty of room around this sentence.
`,
  );

  try {
    const result = await measureRenderedSlides(deckPath);

    assert.equal(result.status, "measured");
    const bySlide = Object.fromEntries(
      result.slides.map((slide) => [slide.slideNumber, slide]),
    );
    assert.deepEqual(bySlide[1].clipped, []);
    assert.equal(bySlide[1].safeMarginPx, 20);
    assert.equal(bySlide[1].crowded.length, 1);
    assert.equal(bySlide[1].crowded[0].edge, "bottom");
    assert.match(bySlide[1].crowded[0].label, /This last line/);
    assert.equal(bySlide[1].crowded[0].gapPx < 20, true);
    assert.deepEqual(bySlide[2].crowded, []);
    assert.deepEqual(bySlide[3].crowded, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measureRenderedSlides records rendered font sizes and flags text below the floor", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-font-"));
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(
    deckPath,
    `---
marp: true
theme: lab
---

<style scoped>
section { font-size: 11px; }
</style>

Scoped body text

---

# Utilities

<p class="text-xs">Extra small utility</p>
<p class="text-xs3">Smallest utility</p>

---

# Footnotes and captions

Claim with a citation<sup>[1]</sup>

<figure><svg width="200" height="40"><text x="0" y="20" font-size="6">diagram label</text></svg><figcaption>Figure caption</figcaption></figure>

<div class="footnote">[1] Default footnote.</div>

---

<style scoped>
section { font-size: 16px; }
</style>

Body text on a smaller base

<div class="footnote">[1] Shrunk footnote.</div>

---

# Transformed

<div style="transform: scale(0.4); transform-origin: left top">Scaled down text</div>
`,
  );

  try {
    const result = await measureRenderedSlides(deckPath);

    assert.equal(result.status, "measured");
    const bySlide = Object.fromEntries(
      result.slides.map((slide) => [slide.slideNumber, slide]),
    );
    const sizeOf = (slide, text) =>
      bySlide[slide].textRuns.find((run) => run.label === `"${text}"`);

    for (const slide of result.slides) {
      assert.deepEqual(slide.textFloorPx, { body: 12, secondary: 8 });
    }

    // A scoped <style> override is measured as rendered.
    assert.equal(sizeOf(1, "Scoped body text").fontPx, 11);
    assert.deepEqual(bySlide[1].smallText, [
      { label: '"Scoped body text"', fontPx: 11, floorPx: 12, secondary: false },
    ]);

    // The theme's small utilities stay above the body floor.
    assert.equal(sizeOf(2, "Extra small utility").fontPx, 19.5);
    assert.equal(sizeOf(2, "Smallest utility").fontPx, 13);
    assert.deepEqual(bySlide[2].smallText, []);

    // Footnotes, citation markers, and captions use the lower floor, and
    // text inside a nested SVG is not measured.
    assert.equal(sizeOf(3, "[1] Default footnote.").fontPx, 10.4);
    assert.equal(sizeOf(3, "[1] Default footnote.").secondary, true);
    assert.equal(sizeOf(3, "[1]").secondary, true);
    assert.equal(sizeOf(3, "Figure caption").secondary, true);
    assert.equal(sizeOf(3, "diagram label"), undefined);
    assert.deepEqual(bySlide[3].smallText, []);

    // A footnote below the lower floor is still reported.
    assert.deepEqual(bySlide[4].smallText, [
      {
        label: '"[1] Shrunk footnote."',
        fontPx: 6.4,
        floorPx: 8,
        secondary: true,
      },
    ]);

    // Transforms count toward the rendered size.
    assert.deepEqual(bySlide[5].smallText, [
      { label: '"Scaled down text"', fontPx: 10.4, floorPx: 12, secondary: false },
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measureRenderedSlides scales the font floor to a paper canvas", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const result = await measureRenderedSlides(
    path.join(__dirname, "../..", "decks", "example-paper", "paper.md"),
  );

  assert.equal(result.status, "measured");
  const [page] = result.slides;
  // An A4 portrait canvas (794x1123) fits a 16:9 reference slide at 62% of
  // its width, so the floors shrink in proportion.
  assert.deepEqual(page.textFloorPx, { body: 7.4, secondary: 5 });
  assert.deepEqual(page.smallText, []);
});

test("measureRenderedSlides reports text that collides with text or media", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-overlap-"));
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(
    deckPath,
    `---
marp: true
theme: lab
math: katex
---

# Body runs into the footnote

<div style="height: 380px"></div>

<p style="margin: 0">This closing sentence runs into the citation.</p>

<div class="footnote" style="top: 522px; bottom: auto">[1] Citation block placed where the body ends.</div>

---

# Text over a diagram

<svg width="480" height="200" viewBox="0 0 480 200"><rect width="480" height="200" fill="#888"/></svg>

<p style="margin-top: -120px">This paragraph is pulled up over the diagram.</p>

---

# Intended overlays

<div style="display: flex; gap: 40px">
<div style="background: #eee; padding: 0.25em 0.35em; text-align: center"><strong style="display: block; font-size: 1.15em; line-height: 1.05">36/36</strong><span style="display: block; font-size: 0.875em; line-height: 1.25">両条件で全クリア</span></div>
<figure style="position: relative; margin: 0"><svg width="300" height="160" viewBox="0 0 300 160"><rect width="300" height="160" fill="#888"/></svg><figcaption style="position: absolute; top: 8px; left: 8px">Overlay caption</figcaption></figure>
<div style="position: relative"><svg width="300" height="160" viewBox="0 0 300 160"><rect width="300" height="160" fill="#888"/></svg><div style="position: absolute; top: 40px; left: 20px; background: #fff; padding: 8px">Label on its own card</div></div>
</div>

Weights $w_{i,j} \\in [-1, 1]$ and $\\sum_{i=1}^{n} x_i^2$ inline.

$$
\\hat{x}_{t+1} = \\sum_{i \\times i} w_{i,j}^{(k)} x_j
$$

<div aria-hidden="true" style="position: absolute; top: 200px; left: 80px; font-size: 140px; opacity: 0.1">DRAFT</div>
`,
  );

  try {
    const result = await measureRenderedSlides(deckPath);

    assert.equal(result.status, "measured");
    const bySlide = Object.fromEntries(
      result.slides.map((slide) => [slide.slideNumber, slide]),
    );

    // Body text that runs into an absolutely positioned footnote block.
    assert.equal(bySlide[1].overlaps.length, 1);
    const [footnote] = bySlide[1].overlaps;
    assert.match(footnote.first, /^"This closing sentence/);
    assert.match(footnote.second, /^"\[1\] Citation block/);
    assert.equal(footnote.overlapPx >= 4, true);
    assert.equal(bySlide[1].maxOverlapPx, footnote.overlapPx);

    // Text from another block drawn over a diagram.
    assert.equal(bySlide[2].overlaps.length, 1);
    assert.match(bySlide[2].overlaps[0].first, /^"This paragraph is pulled up/);
    assert.equal(bySlide[2].overlaps[0].second, "<svg>");

    // Tight line boxes whose glyphs do not touch, a caption overlaid inside
    // its figure, a label on its own background over media, math internals,
    // and an aria-hidden decoration are intended and not reported.
    assert.deepEqual(bySlide[3].overlaps, []);
    assert.equal(bySlide[3].maxOverlapPx, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measureRenderedSlides reports media that fail to load", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-media-"));
  const deckPath = path.join(dir, "slide.md");
  fs.mkdirSync(path.join(dir, "assets/img"), { recursive: true });
  // A real 1x1 PNG, an undecodable file, and a symlink whose target is gone.
  fs.writeFileSync(
    path.join(dir, "assets/img/ok.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  fs.writeFileSync(path.join(dir, "assets/img/corrupt.png"), "not an image");
  fs.symlinkSync("../../gone/figure.png", path.join(dir, "assets/img/linked.png"));
  fs.writeFileSync(
    deckPath,
    `---
marp: true
theme: lab
---

# Loads

<img src="assets/img/ok.png" />

---

# Broken

<img src="assets/img/missing.png" />
<img src="assets/img/corrupt.png" />
<img src="assets/img/linked.png" />

---

# Video

<video src="assets/video/missing.mp4" muted></video>

---

# Remote

<img src="https://example.invalid/figure.png" />
`,
  );

  try {
    const result = await measureRenderedSlides(deckPath);

    assert.equal(result.status, "measured");
    const bySlide = Object.fromEntries(
      result.slides.map((slide) => [
        slide.slideNumber,
        slide.missingMedia.map((item) => [item.reference, item.reason]),
      ]),
    );
    assert.deepEqual(bySlide[1], []);
    assert.deepEqual(bySlide[2], [
      ["assets/img/missing.png", "not found"],
      ["assets/img/corrupt.png", "failed to decode"],
      ["assets/img/linked.png", "broken symlink"],
    ]);
    assert.deepEqual(bySlide[3], [["assets/video/missing.mp4", "not found"]]);
    assert.deepEqual(bySlide[4], []);
    const [missing] = result.slides[1].missingMedia;
    assert.equal(missing.path, path.join(dir, "assets/img/missing.png"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measureRenderedSlides renders a deck whose directory name contains # and %", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-#%-dir-"));
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(
    deckPath,
    `---
marp: true
theme: lab
---

# Encoded path

This slide lives in a directory that needs URL encoding.
`,
  );

  try {
    assert.match(dir, /#/);
    assert.match(dir, /%/);
    const result = await measureRenderedSlides(deckPath);

    assert.equal(result.status, "measured");
    assert.deepEqual(
      result.slides.map((slide) => slide.clipped),
      [[]],
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measureRenderedSlides reports a skipped check instead of throwing", async () => {
  process.env.MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE = "1";
  try {
    const result = await measureRenderedSlides(fixture("clean-slide.md"));
    assert.equal(result.status, "skipped");
    assert.match(result.reason, /Forced visual check failure/);
    assert.deepEqual(result.slides, []);
  } finally {
    delete process.env.MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE;
  }
});
