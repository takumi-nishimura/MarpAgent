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
