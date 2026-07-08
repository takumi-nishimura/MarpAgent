const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../..");
const {
  buildDesignContent,
  createThemeFiles,
  normalizeThemeName,
  parseArgs,
} = require("../../scripts/new-theme.js");

function withTempRepo(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "marpagent-theme-"));
  try {
    return fn(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function seedLabDesign(tempRoot) {
  const labDir = path.join(tempRoot, "designs", "lab");
  fs.mkdirSync(labDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, "designs", "lab", "DESIGN.md"),
    path.join(labDir, "DESIGN.md"),
  );
}

test("new-theme scaffolds design, theme source, and fixture", () => {
  withTempRepo((tempRoot) => {
    seedLabDesign(tempRoot);

    const created = createThemeFiles({
      repoRoot: tempRoot,
      name: "plain",
      sourceUrl: "https://example.com/brand",
    });

    assert.deepEqual(
      created.map((filePath) => path.relative(tempRoot, filePath)).sort(),
      [
        "designs/plain/DESIGN.md",
        "fixtures/plain-slide.md",
        "themes/src/plain.css",
      ],
    );

    const design = fs.readFileSync(
      path.join(tempRoot, "designs", "plain", "DESIGN.md"),
      "utf8",
    );
    assert.match(design, /^name: Plain$/m);
    assert.match(design, /^# Plain Design$/m);
    assert.match(design, /Scaffold source: https:\/\/example\.com\/brand/);
    assert.match(design, /^  code-comment:/m);
    assert.doesNotMatch(design, /MarpAgent Lab is/);

    const css = fs.readFileSync(
      path.join(tempRoot, "themes", "src", "plain.css"),
      "utf8",
    );
    assert.match(css, /@theme plain/);
    assert.match(css, /@size 16:9 1280px 720px/);
    assert.match(css, /@import "\.\/_generated\/plain-design-tokens\.css";/);
    assert.match(css, /@source "\.\.\/\.\.\/decks\/\*\*\/\*\.md";/);

    const fixture = fs.readFileSync(
      path.join(tempRoot, "fixtures", "plain-slide.md"),
      "utf8",
    );
    assert.match(fixture, /theme: plain/);
    assert.match(fixture, /Plain Theme/);
  });
});

test("new-theme reuses lab DESIGN.md as the complete token scaffold", () => {
  withTempRepo((tempRoot) => {
    seedLabDesign(tempRoot);

    const design = buildDesignContent(
      tempRoot,
      "source-heavy",
      "https://example.com/design",
    );

    assert.match(design, /^name: Source Heavy$/m);
    assert.match(design, /^# Source Heavy Design$/m);
    assert.match(design, /Scaffold source: https:\/\/example\.com\/design/);
    assert.match(design, /^  code-dark-meta:/m);
  });
});

test("new-theme validates and normalizes theme names", () => {
  assert.equal(normalizeThemeName("Muji"), "muji");
  assert.equal(normalizeThemeName("muji-lab2"), "muji-lab2");

  assert.throws(() => normalizeThemeName("bad name"), /Theme name must match/);
  assert.throws(() => normalizeThemeName("bad--name"), /repeated or trailing/);
  assert.throws(() => normalizeThemeName("bad-"), /repeated or trailing/);
});

test("new-theme refuses to overwrite scaffold files unless forced", () => {
  withTempRepo((tempRoot) => {
    seedLabDesign(tempRoot);
    createThemeFiles({ repoRoot: tempRoot, name: "plain" });

    assert.throws(
      () => createThemeFiles({ repoRoot: tempRoot, name: "plain" }),
      /Refusing to overwrite existing path/,
    );

    assert.doesNotThrow(() =>
      createThemeFiles({ repoRoot: tempRoot, name: "plain", force: true }),
    );
  });
});

test("new-theme parses source and build options", () => {
  assert.deepEqual(parseArgs(["plain"]), {
    name: "plain",
    sourceUrl: "",
    force: false,
    build: true,
  });
  assert.deepEqual(
    parseArgs([
      "plain",
      "--source-url",
      "https://example.com/brand",
      "--force",
      "--no-build",
    ]),
    {
      name: "plain",
      sourceUrl: "https://example.com/brand",
      force: true,
      build: false,
    },
  );
});
