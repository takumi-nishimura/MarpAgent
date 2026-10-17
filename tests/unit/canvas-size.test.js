const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Marp } = require("@marp-team/marp-core/full");

const {
  ensureCustomSizesForMarkdown,
  getCanvasSize,
  findCustomPixelSizes,
  injectCustomSizeMetadata,
  isASeriesCanvas,
  parseCustomPixelSize,
} = require("../../src/canvas-size");

const repoRoot = path.resolve(__dirname, "../..");
const { createConfiguredMarp, buildSlideMap } = require("../../src/slide-map");

test("a leading BOM preserves canvas directives and slide source locations", () => {
  for (const prefix of ["", "\uFEFF"]) {
    const markdown = `${prefix}---\nmarp: true\ntheme: lab\nsize: 4:3\n---\n# Content\n`;
    const marp = createConfiguredMarp();
    marp.themeSet.add(fs.readFileSync(path.join(repoRoot, "themes/lab.css"), "utf8"));
    assert.equal(getCanvasSize(markdown), "4:3");
    assert.match(marp.render(markdown).html, /viewBox="0 0 1024 768"/);
    const slides = buildSlideMap(markdown);
    assert.equal(slides.length, 1);
    assert.equal(slides[0].line, 6);
    assert.equal(slides[0].raw, "# Content\n");
  }
});

test("canvas frontmatter accepts longer closing fences and trailing spaces", () => {
  for (const closing of ["----", "---  ", "   ----\t"]) {
    assert.equal(getCanvasSize(`---\nsize: 4:3\n${closing}\n# Content`), "4:3");
  }
});

test("parseCustomPixelSize accepts bounded width x height values", () => {
  assert.deepEqual(parseCustomPixelSize("400x200"), {
    name: "400x200",
    width: 400,
    height: 200,
  });
  assert.deepEqual(parseCustomPixelSize("10000x9999"), {
    name: "10000x9999",
    width: 10000,
    height: 9999,
  });

  assert.equal(parseCustomPixelSize("0x200"), null);
  assert.equal(parseCustomPixelSize("400x0"), null);
  assert.equal(parseCustomPixelSize("10001x200"), null);
  assert.equal(parseCustomPixelSize("400 x 200"), null);
  assert.equal(parseCustomPixelSize("16:9"), null);
});

test("findCustomPixelSizes reads frontmatter size", () => {
  const markdown = "---\nmarp: true\nsize: 400x200\n---\n# Custom\n";
  assert.deepEqual(findCustomPixelSizes(markdown), [
    { name: "400x200", width: 400, height: 200 },
  ]);
});

test("isASeriesCanvas detects supported A4 orientation sizes only", () => {
  assert.equal(isASeriesCanvas("a4-portrait"), true);
  assert.equal(isASeriesCanvas("a4-landscape"), true);
  assert.equal(isASeriesCanvas("a3-portrait"), false);
  assert.equal(isASeriesCanvas("a0-portrait"), false);
  assert.equal(isASeriesCanvas("a0"), false);
  assert.equal(isASeriesCanvas("16:9"), false);
  assert.equal(isASeriesCanvas("400x200"), false);
});

test("injectCustomSizeMetadata appends @size inside Marp theme comment", () => {
  const css = "/*!\n * @theme lab\n * @size 16:9 1280px 720px\n */\nsection{}";
  const nextCss = injectCustomSizeMetadata(css, [
    { name: "400x200", width: 400, height: 200 },
  ]);

  assert.match(
    nextCss,
    /@theme lab\n \* @size 400x200 400px 200px\n \* @size 16:9/,
  );
});

test("ensureCustomSizesForMarkdown lets Marp render custom pixel canvas", () => {
  const marp = new Marp();
  marp.themeSet.add(
    fs.readFileSync(path.join(repoRoot, "themes/lab.css"), "utf8"),
  );

  const markdown = "---\nmarp: true\ntheme: lab\nsize: 400x200\n---\n# Custom\n";
  assert.equal(ensureCustomSizesForMarkdown(marp, markdown), true);

  const { html } = marp.render(markdown);
  assert.match(html, /viewBox="0 0 400 200"/);
});
