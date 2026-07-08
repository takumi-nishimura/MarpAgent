const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

function collectCssFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".css")) files.push(entryPath);
  }

  return files.sort();
}

function getDesignmdBin() {
  const binName = process.platform === "win32" ? "designmd.cmd" : "designmd";
  return path.join(repoRoot, "node_modules", ".bin", binName);
}

test("Mermaid theme CSS exposes sizing custom properties", () => {
  for (const relativePath of [
    "themes/src/_shared/_layouts.css",
    "themes/src/_shared/_paper.css",
    "themes/lab.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(css, /--mermaid-width/);
    assert.match(css, /--mermaid-max-width/);
    assert.match(css, /--mermaid-max-height/);
    assert.match(css, /--mermaid-overflow/);
    assert.match(css, /flex:\s*0 0 auto/);
  }
});

test("title logo background sizing defaults to height-based and remains overridable", () => {
  for (const relativePath of [
    "themes/src/_shared/_base.css",
    "themes/lab.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(
      css,
      /--logo-title-background-size:\s*auto 50px/,
    );
    assert.match(
      css,
      /section\.title header\s*\{[\s\S]*background-size:[\s\S]*var\(--logo-title-background-size\)/,
    );
    assert.match(
      css,
      /section:not\(\.title\) header:not\(\.paper-header\)::after\s*\{[\s\S]*background-size:[\s\S]*auto var\(--logo-header-size\)/,
    );
  }
});

test("theme CSS provides reusable layout component classes", () => {
  for (const relativePath of [
    "themes/src/_shared/_layouts.css",
    "themes/lab.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(css, /\.summary-box\b/);
    assert.match(css, /\.gap-cols\b/);
    assert.match(css, /\.gap-box\b/);
    assert.match(css, /\.feature-grid\b/);
  }
});

test("theme CSS defines default subtle panel token", () => {
  for (const relativePath of [
    "themes/src/_shared/_base.css",
    "themes/lab.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(css, /--bg-gray-5:/);
  }
});

test("theme sources explicitly bound Tailwind class detection", () => {
  const css = fs.readFileSync(path.join(repoRoot, "themes/src/lab.css"), "utf8");
  assert.match(css, /@import "tailwindcss" source\(none\);/);
  assert.match(css, /@source "\.\.\/\.\.\/decks\/\*\*\/\*\.md";/);
  assert.match(css, /@source "\.\.\/\.\.\/fixtures\/\*\*\/\*\.md";/);
  assert.match(css, /@source "\.\.\/\.\.\/\.agents\/skills\/\*\*\/\*\.md";/);
  assert.match(css, /@import "\.\/_generated\/lab-design-tokens\.css";/);
});

test("lab theme declares canvas size families and imports paper components", () => {
  const css = fs.readFileSync(path.join(repoRoot, "themes/src/lab.css"), "utf8");
  assert.match(css, /@size 16:9 1280px 720px/);
  assert.match(css, /@size 4:3 1024px 768px/);
  assert.match(css, /@size a4-portrait 210mm 297mm/);
  assert.match(css, /@size a4-landscape 297mm 210mm/);
  assert.doesNotMatch(css, /@theme poster/);
  assert.match(css, /@import "\.\/_shared\/_paper\.css";/);

  assert.equal(
    fs.existsSync(path.join(repoRoot, "themes/src/poster.css")),
    false,
  );
  assert.equal(fs.existsSync(path.join(repoRoot, "themes/poster.css")), false);

  const paper = fs.readFileSync(
    path.join(repoRoot, "themes/src/_shared/_paper.css"),
    "utf8",
  );
  assert.match(paper, /A-series paper layout components/);
  assert.match(paper, /\.paper-header\b/);
  assert.match(paper, /\.paper-columns\b/);
  assert.match(paper, /\.paper-section\b/);
  assert.match(paper, /\.paper-footer\b/);
});

test("generated design token CSS is fresh", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/generate-design-tokens.js", "--check"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const generated = fs.readFileSync(
    path.join(repoRoot, "themes/src/_generated/lab-design-tokens.css"),
    "utf8",
  );
  assert.match(generated, /Generated from designs\/lab\/DESIGN\.md/);
  assert.match(generated, /--color-primary:\s*#202228;/);
  assert.match(generated, /--text-body-md:\s*26px;/);
  assert.match(generated, /--spacing-slide-x:\s*40px;/);
});

test("lab DESIGN.md passes designmd lint without warnings", () => {
  const result = spawnSync(getDesignmdBin(), ["lint", "designs/lab/DESIGN.md"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.warnings, 0);
});

test("theme source colors come from generated design tokens", () => {
  const sourceFiles = collectCssFiles(path.join(repoRoot, "themes/src"))
    .filter((filePath) => !filePath.includes(`${path.sep}_generated${path.sep}`));
  const colorLiteralPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

  for (const filePath of sourceFiles) {
    const css = fs.readFileSync(filePath, "utf8");
    assert.doesNotMatch(
      css,
      colorLiteralPattern,
      `${path.relative(repoRoot, filePath)} should reference generated design tokens instead of literal colors`,
    );
  }
});

test("legacy deck color variables map to lab design tokens", () => {
  const css = fs.readFileSync(
    path.join(repoRoot, "themes/src/_shared/_colors.css"),
    "utf8",
  );
  assert.match(css, /--color-deck-white:\s*var\(--color-neutral\)/);
  assert.match(css, /--color-deck-black:\s*var\(--color-primary\)/);
  assert.match(css, /--color-deck-gray:\s*var\(--color-secondary\)/);
  assert.match(css, /--color-deck-blue:\s*var\(--color-blue\)/);
});

test("lab DESIGN.md follows the Google design.md document shape", () => {
  const design = fs.readFileSync(path.join(repoRoot, "designs/lab/DESIGN.md"), "utf8");
  assert.match(design, /^---\n/);
  assert.match(design, /\n---\n\n# MarpAgent Lab Design\n/);

  for (const key of [
    "version:",
    "name:",
    "description:",
    "colors:",
    "typography:",
    "rounded:",
    "spacing:",
    "components:",
  ]) {
    assert.match(design, new RegExp(`^${key}`, "m"));
  }

  const headings = [...design.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings, [
    "Overview",
    "Colors",
    "Typography",
    "Layout",
    "Elevation & Depth",
    "Shapes",
    "Components",
    "Do's and Don'ts",
  ]);
});
