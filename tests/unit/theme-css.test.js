const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
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

function collectMarkdownFiles(targetPath) {
  if (!fs.statSync(targetPath).isDirectory()) return [targetPath];

  const files = [];
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(entryPath);
  }

  return files.sort();
}

// Compiled themes are the ones Marp loads (see marp.config.js). Theme sources
// are not listed directly because cli-args.test.js scaffolds a temporary
// source into themes/src/ while tests run concurrently.
function discoverThemeNames() {
  return fs
    .readdirSync(path.join(repoRoot, "themes"))
    .filter((name) => name.endsWith(".css"))
    .map((name) => name.replace(/\.css$/, ""))
    .sort();
}

function readFileIfPresent(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// Markdown that shows authors how to write decks. Example decks are named
// explicitly: downstream repositories add their own decks under decks/, and
// those must not change what the coverage tests check.
function readAuthorFacingMarkdown() {
  return [
    "fixtures",
    "decks/example",
    "decks/example-paper",
    "template",
    ".agents/skills",
    "README.md",
  ]
    .flatMap((relativePath) =>
      collectMarkdownFiles(path.join(repoRoot, relativePath)),
    )
    .map((filePath) => ({
      filePath: path.relative(repoRoot, filePath),
      // A concurrently scaffolded temporary fixture may vanish mid-scan.
      markdown: readFileIfPresent(filePath),
    }))
    .filter(({ markdown }) => markdown !== null);
}

function readTailwindTextScale() {
  const css = fs.readFileSync(
    require.resolve("tailwindcss/theme.css", { paths: [repoRoot] }),
    "utf8",
  );
  return [...css.matchAll(/^\s*(--text-[a-z0-9]+(?:--line-height)?):\s*([^;]+);/gm)]
    .map((match) => [match[1], match[2].trim()]);
}

function readSafelistedUtilities(css) {
  return [...css.matchAll(/@source\s+inline\("([^"]*)"\);/g)]
    .flatMap((match) => match[1].split(/\s+/))
    .filter(Boolean)
    .sort();
}

function getDesignmdBin() {
  const binName = process.platform === "win32" ? "designmd.cmd" : "designmd";
  return path.join(repoRoot, "node_modules", ".bin", binName);
}

function getTailwindBin() {
  const binName =
    process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss";
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
    assert.match(css, /\.col\.with-summary\b/);
    assert.match(css, /\.gap-box\b/);
    assert.match(css, /\.feature-grid\b/);
    assert.match(css, /\.col\.visual\b/);
    assert.match(css, /\.metric-grid\b/);
    assert.match(css, /\.timeline\b/);
    assert.match(css, /\.box\b/);
    assert.doesNotMatch(css, /\.two-column\b/);
    assert.match(css, /\.box,\s*\.col\s*>\s*div\s*\{[\s\S]*display:\s*flex/);
    assert.match(
      css,
      /\.box,\s*\.col\s*>\s*div\s*\{[\s\S]*flex-direction:\s*column/,
    );
    assert.match(css, /\.summary-box\s*\{[\s\S]*width:\s*fit-content/);
    assert.match(css, /\.self-center\s*\{[\s\S]*margin-left:\s*auto/);
    assert.match(css, /section:has\(>\s*\.fill\)/);
    assert.match(css, /section\s*>\s*\.fill\s*\{[\s\S]*flex:\s*1/);
    assert.match(
      css,
      /section\.title:has\(>\s*\.fill\)\s*\{[\s\S]*--fill-bottom-safe:\s*0/,
    );
    assert.match(css, /--fill-bottom-safe:\s*1\.25em/);
    assert.match(css, /margin-bottom:\s*var\(--fill-bottom-safe\)/);
    assert.match(css, /\.col\.fill\s*\{[\s\S]*align-items:\s*stretch/);
    assert.match(css, /--place-block:\s*flex-start/);
    assert.match(css, /--place-inline:\s*stretch/);
    assert.match(
      css,
      /\.box\.place-middle,\s*\.col\s*>\s*div\.place-middle\s*\{[\s\S]*--place-block:\s*center/,
    );
    assert.match(
      css,
      /\.box\.place-spread,\s*\.col\s*>\s*div\.place-spread\s*\{[\s\S]*--place-block:\s*space-between/,
    );
    assert.match(
      css,
      /\.box\.place-center,\s*\.col\s*>\s*div\.place-center\s*\{[\s\S]*--place-inline:\s*center/,
    );
    assert.doesNotMatch(css, /\.v-center\b/);
    assert.doesNotMatch(css, /\.h-center\b/);
    assert.doesNotMatch(css, /\.center\b/);
    assert.match(css, /--timeline-gap:\s*1\.1em/);
    assert.match(css, /--timeline-arrow-offset:\s*0\.55em/);
    assert.match(css, /--timeline-marker-fg:\s*var\(--highlight\)/);
    assert.match(css, /\.timeline\s*>\s*li::before\s*\{[\s\S]*content:\s*none/);
    assert.match(css, /ol\.timeline\s*\{[\s\S]*counter-reset:\s*timeline-step/);
    assert.match(
      css,
      /ol\.timeline\s*>\s*li\s*\{[\s\S]*counter-increment:\s*timeline-step/,
    );
    assert.match(
      css,
      /ol\.timeline\s*>\s*li::before\s*\{[\s\S]*content:\s*counter\(timeline-step\)/,
    );
    assert.match(css, /color:\s*var\(--timeline-marker-fg\)/);
    assert.doesNotMatch(css, /--timeline-marker-bg/);
    assert.match(css, /\.timeline\s*>\s*li::marker\b/);
    assert.match(css, /\.timeline\s*>\s*li:not\(:last-child\)::after\b/);
    assert.match(css, /left:\s*calc\(100% \+ var\(--timeline-arrow-offset\)\)/);
    assert.match(css, /border-top:\s*var\(--timeline-arrow-stroke\) solid var\(--accent-rule\)/);
    assert.match(css, /border-right:\s*var\(--timeline-arrow-stroke\) solid var\(--accent-rule\)/);
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

test("lab font defaults remain overridable after theme compilation", () => {
  for (const relativePath of ["themes/src/lab.css", "themes/lab.css"]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(css, /--font-body:\s*"Noto Sans JP",\s*sans-serif/);
    assert.match(css, /--font-display:\s*var\(--font-body\)/);
    assert.match(css, /font-family:\s*var\(--font-body\)/);
    assert.match(
      css,
      /section h1,?[\s\S]*section h2,?[\s\S]*section h3,?[\s\S]*section h4\s*\{[\s\S]*font-family:\s*var\(--font-display\)/,
    );
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

test("theme sources take Tailwind utilities only from the explicit safelist", () => {
  const themeNames = discoverThemeNames();
  assert.deepEqual(themeNames, ["lab", "muji", "toshiba"]);

  for (const themeName of themeNames) {
    const css = fs.readFileSync(
      path.join(repoRoot, "themes/src", `${themeName}.css`),
      "utf8",
    );
    assert.match(css, /@import "tailwindcss" source\(none\);/);
    // No file globs: decks, fixtures, and skill prose must not add utilities.
    assert.doesNotMatch(css, /@source\s+"/);
    assert.match(css, /@import "\.\/_shared\/_safelist\.css";/);
    assert.match(
      css,
      new RegExp(
        `@import "\\./_generated/${themeName}-design-tokens\\.css" theme\\(static\\);`,
      ),
    );
  }

  const safelist = fs.readFileSync(
    path.join(repoRoot, "themes/src/_shared/_safelist.css"),
    "utf8",
  );
  assert.doesNotMatch(safelist, /@source\s+"/);
  assert.deepEqual(readSafelistedUtilities(safelist), [
    "self-center",
    "self-end",
    "self-start",
    "text-sm",
    "text-xl",
    "text-xs",
  ]);
});

test("compiled themes contain no utilities generated from prose words", () => {
  for (const themeName of discoverThemeNames()) {
    const css = fs.readFileSync(
      path.join(repoRoot, "themes", `${themeName}.css`),
      "utf8",
    );
    for (const word of [
      "fixed",
      "static",
      "lowercase",
      "hidden",
      "container",
      "transition",
    ]) {
      assert.doesNotMatch(
        css,
        new RegExp(`^\\s*\\.${word}\\s*\\{`, "m"),
        `themes/${themeName}.css should not define .${word}`,
      );
    }
  }
});

test("compiled themes define every design token for deck-local styles", () => {
  for (const themeName of discoverThemeNames()) {
    const tokens = fs.readFileSync(
      path.join(repoRoot, "themes/src/_generated", `${themeName}-design-tokens.css`),
      "utf8",
    );
    const tokenNames = [...tokens.matchAll(/^\s*(--[\w-]+):/gm)].map(
      (match) => match[1],
    );
    assert.ok(tokenNames.includes("--color-tertiary"));

    const css = fs.readFileSync(
      path.join(repoRoot, "themes", `${themeName}.css`),
      "utf8",
    );
    for (const tokenName of tokenNames) {
      assert.ok(
        css.includes(`${tokenName}:`),
        `themes/${themeName}.css should define ${tokenName}`,
      );
    }
  }
});

test("compiled theme CSS matches a fresh Tailwind build", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "marp-theme-build-"));
  try {
    for (const themeName of discoverThemeNames()) {
      const outputPath = path.join(tempRoot, `${themeName}.css`);
      const result = spawnSync(
        getTailwindBin(),
        [
          "-i",
          path.join(repoRoot, "themes/src", `${themeName}.css`),
          "-o",
          outputPath,
        ],
        { cwd: repoRoot, encoding: "utf8" },
      );
      assert.equal(result.status, 0, result.stderr || result.stdout);

      const fresh = fs.readFileSync(outputPath, "utf8");
      const committed = fs.readFileSync(
        path.join(repoRoot, "themes", `${themeName}.css`),
        "utf8",
      );
      assert.ok(
        fresh === committed,
        `themes/${themeName}.css is stale; rebuild it with "npm run marpx -- --theme ${themeName}"`,
      );
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("classes used by examples, fixtures, templates, and skills exist in every compiled theme", () => {
  const usedClasses = new Map();
  for (const { filePath, markdown } of readAuthorFacingMarkdown()) {
    for (const match of markdown.matchAll(/\bclass="([^"]*)"/g)) {
      for (const className of match[1].split(/\s+/)) {
        if (!/^[a-z][a-z0-9-]*$/.test(className)) continue;
        if (!usedClasses.has(className)) {
          usedClasses.set(className, filePath);
        }
      }
    }
  }
  assert.ok(usedClasses.size > 0);

  for (const themeName of discoverThemeNames()) {
    const css = fs.readFileSync(
      path.join(repoRoot, "themes", `${themeName}.css`),
      "utf8",
    );
    const definedClasses = new Set(
      [...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]),
    );
    for (const [className, filePath] of usedClasses) {
      assert.ok(
        definedClasses.has(className),
        `${filePath} uses class "${className}", which themes/${themeName}.css does not define`,
      );
    }
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
  for (const designName of ["lab", "muji", "toshiba"]) {
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

test("toshiba theme renders a smoke deck", () => {
  const marp = new Marp();
  marp.themeSet.add(
    fs.readFileSync(path.join(repoRoot, "themes/toshiba.css"), "utf8"),
  );
  const markdown = fs.readFileSync(
    path.join(repoRoot, "fixtures/toshiba-slide.md"),
    "utf8",
  );
  const { html } = marp.render(markdown);

  assert.match(html, /Toshiba Theme/);
  assert.match(html, /data-theme="toshiba"/);
});

test("muji header title inset comes from design tokens", () => {
  const css = fs.readFileSync(path.join(repoRoot, "themes/src/muji.css"), "utf8");
  assert.match(css, /--header-title-inset:\s*var\(--spacing-header-title-inset\)/);
  assert.match(
    css,
    /padding-left:\s*calc\(var\(--padding-x\) \+ var\(--header-title-inset\)\)/,
  );
});

test("CSS variables referenced by examples, fixtures, templates, and skills resolve in every compiled theme", () => {
  const referencedVariables = new Map();
  for (const { filePath, markdown } of readAuthorFacingMarkdown()) {
    const localVariables = new Set(
      [...markdown.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
    );
    for (const match of markdown.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const variableName = match[1];
      if (localVariables.has(variableName)) continue;
      if (!referencedVariables.has(variableName)) {
        referencedVariables.set(variableName, filePath);
      }
    }
  }
  assert.ok(referencedVariables.has("--color-tertiary"));

  for (const themeName of discoverThemeNames()) {
    const css = fs.readFileSync(
      path.join(repoRoot, "themes", `${themeName}.css`),
      "utf8",
    );
    for (const [variableName, filePath] of referencedVariables) {
      assert.ok(
        css.includes(`${variableName}:`),
        `${filePath} references var(${variableName}), which themes/${themeName}.css does not define`,
      );
    }
  }
});

test("compiled themes define the full Tailwind text scale for deck-local styles", () => {
  const textScale = readTailwindTextScale();
  assert.equal(textScale.length, 26);

  const safelist = fs.readFileSync(
    path.join(repoRoot, "themes/src/_shared/_safelist.css"),
    "utf8",
  );
  const staticBlock = safelist.match(/@theme static \{([^}]*)\}/);
  assert.ok(staticBlock, "_safelist.css should declare an @theme static block");
  for (const [variableName, value] of textScale) {
    // The static block restates Tailwind's defaults; catch drift on upgrades.
    assert.ok(
      staticBlock[1].includes(`${variableName}: ${value};`),
      `_safelist.css should restate ${variableName}: ${value};`,
    );
  }

  for (const themeName of discoverThemeNames()) {
    const css = fs.readFileSync(
      path.join(repoRoot, "themes", `${themeName}.css`),
      "utf8",
    );
    // Downstream decks use var(--text-lg) in inline styles.
    assert.match(css, /--text-lg:\s*1\.125rem;/);
    for (const [variableName, value] of textScale) {
      assert.ok(
        css.includes(`${variableName}: ${value};`),
        `themes/${themeName}.css should define ${variableName}`,
      );
    }
  }
});
