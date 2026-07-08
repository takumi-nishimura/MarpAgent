const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { Marp } = require("@marp-team/marp-core");

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

test("lab default highlight follows the warm accent token", () => {
  for (const relativePath of [
    "themes/src/_shared/_base.css",
    "themes/lab.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(css, /--highlight:\s*var\(--color-accent-strong\)/);
    assert.doesNotMatch(css, /--highlight:\s*var\(--color-tertiary\)/);
  }
});

test("normal slide header uses a flat surface with an accent rule", () => {
  for (const relativePath of [
    "themes/src/_shared/_base.css",
    "themes/lab.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(
      css,
      /section:not\(\.title\) header:not\(\.paper-header\)\s*\{[\s\S]*background:\s*var\(--bg\)/,
    );
    assert.match(
      css,
      /--accent-rule:\s*color-mix\(in srgb, var\(--highlight\) 40%, transparent\)/,
    );
    assert.match(
      css,
      /--accent-rule-width:\s*2px/,
    );
    assert.match(
      css,
      /section:not\(\.title\) header:not\(\.paper-header\)\s*\{[\s\S]*border-bottom:\s*var\(--accent-rule-width\) solid var\(--accent-rule\)/,
    );
    assert.match(
      css,
      /section:not\(\.title\) header:not\(\.paper-header\)\s*\{[\s\S]*color:\s*var\(--fg\)/,
    );
    assert.doesNotMatch(
      css,
      /section:not\(\.title\) header:not\(\.paper-header\)\s*\{[\s\S]*background-image:\s*linear-gradient/,
    );
  }
});

test("title and normal slide rules share the same accent treatment", () => {
  for (const relativePath of [
    "themes/src/_shared/_base.css",
    "themes/lab.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(
      css,
      /section\.title h1\s*\{[\s\S]*border-bottom:\s*var\(--accent-rule-width\) solid var\(--accent-rule\)/,
    );
    assert.doesNotMatch(
      css,
      /section\.title h1\s*\{[\s\S]*border-bottom:\s*1px solid var\(--fg\)/,
    );
  }
});

test("theme sources explicitly bound Tailwind class detection", () => {
  for (const themeName of ["lab", "muji"]) {
    const css = fs.readFileSync(
      path.join(repoRoot, "themes/src", `${themeName}.css`),
      "utf8",
    );
    assert.match(css, /@import "tailwindcss" source\(none\);/);
    assert.match(css, /@source "\.\.\/\.\.\/decks\/\*\*\/\*\.md";/);
    assert.match(css, /@source "\.\.\/\.\.\/fixtures\/\*\*\/\*\.md";/);
    assert.match(css, /@source "\.\.\/\.\.\/\.agents\/skills\/\*\*\/\*\.md";/);
    assert.match(
      css,
      new RegExp(`@import "\\./_generated/${themeName}-design-tokens\\.css";`),
    );
  }
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

test("generated design token CSS is fresh for all designs", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/generate-design-tokens.js", "--all", "--check"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);

  for (const [name, expectations] of [
    [
      "lab",
      [/--color-primary:\s*#202228;/, /--text-body-md:\s*26px;/],
    ],
    [
      "muji",
      [
        /--color-muji-red:\s*#7f0019;/,
        /--text-body-md:\s*24px;/,
        /--spacing-header-title-inset:\s*20px;/,
      ],
    ],
  ]) {
    const generated = fs.readFileSync(
      path.join(repoRoot, `themes/src/_generated/${name}-design-tokens.css`),
      "utf8",
    );
    assert.match(generated, new RegExp(`Generated from designs/${name}/DESIGN\\.md`));
    for (const expectation of expectations) assert.match(generated, expectation);
  }
});

test("all DESIGN.md files pass designmd lint without warnings", () => {
  for (const designName of ["lab", "muji"]) {
    const result = spawnSync(
      getDesignmdBin(),
      ["lint", `designs/${designName}/DESIGN.md`],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.summary.errors, 0);
    assert.equal(report.summary.warnings, 0);
  }
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

test("DESIGN.md files follow the Google design.md document shape", () => {
  for (const designName of ["lab", "muji"]) {
    const design = fs.readFileSync(
      path.join(repoRoot, "designs", designName, "DESIGN.md"),
      "utf8",
    );
    assert.match(design, /^---\n/);
    assert.match(design, /\n---\n\n# .+ Design\n/);

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
  }
});

test("muji theme renders a smoke deck", () => {
  const marp = new Marp();
  marp.themeSet.add(fs.readFileSync(path.join(repoRoot, "themes/muji.css"), "utf8"));
  const markdown = fs.readFileSync(path.join(repoRoot, "fixtures/muji-slide.md"), "utf8");
  const { html } = marp.render(markdown);

  assert.match(html, /MUJI Theme/);
  assert.match(html, /data-theme="muji"/);
});

test("muji header title inset comes from design tokens", () => {
  const css = fs.readFileSync(path.join(repoRoot, "themes/src/muji.css"), "utf8");
  assert.match(css, /--header-title-inset:\s*var\(--spacing-header-title-inset\)/);
  assert.match(
    css,
    /padding-left:\s*calc\(var\(--padding-x\) \+ var\(--header-title-inset\)\)/,
  );
});
