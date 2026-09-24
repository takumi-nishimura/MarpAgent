const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

test("lint-deck --autofix normalizes tiny typography markers", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-lint-"));
  const deckPath = path.join(tempDir, "slide.md");

  try {
    fs.writeFileSync(
      deckPath,
      `---
marp: true
---
# Title

<div class="text-xs3">detail</div>
<div class="text-xs">caption</div>
<small>footnote</small>
`,
    );

    const result = spawnSync(
      process.execPath,
      ["scripts/lint-deck.js", deckPath, "--autofix", "--format", "json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          MARP_AGENT_REQUIRE_VISUAL: "0",
        },
      },
    );

    assert.equal(result.status, 0);
    const updated = fs.readFileSync(deckPath, "utf8");
    assert.equal(updated.includes("text-xs3"), false);
    assert.equal(updated.includes("text-xs\">caption"), true);
    assert.equal(updated.includes("<small>"), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("lint-deck --autofix leaves fenced code and code spans byte-identical", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-lint-"));
  const deckPath = path.join(tempDir, "slide.md");

  try {
    fs.writeFileSync(
      deckPath,
      `---
marp: true
---
# Title

<div class="text-xs3">detail</div>
<small>footnote</small>

The \`text-xs2\` class and \`<small>fine</small>\` span stay literal.

\`\`\`html
<div class="text-xs2">sample</div>
<small>inside</small>
\`\`\`
`,
    );

    const result = spawnSync(
      process.execPath,
      ["scripts/lint-deck.js", deckPath, "--autofix", "--format", "json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          MARP_AGENT_REQUIRE_VISUAL: "0",
        },
      },
    );

    assert.equal(result.status, 0);
    const updated = fs.readFileSync(deckPath, "utf8");
    assert.equal(updated.includes('<div class="text-sm">detail</div>'), true);
    assert.equal(updated.includes("\nfootnote\n"), true);
    assert.equal(
      updated.includes("The `text-xs2` class and `<small>fine</small>` span"),
      true,
    );
    assert.equal(
      updated.includes(
        '```html\n<div class="text-xs2">sample</div>\n<small>inside</small>\n```',
      ),
      true,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("lint-deck prints a deprecation notice for the --lint alias", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/lint-deck.js", "fixtures/clean-slide.md", "--format", "json"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        MARP_AGENT_REQUIRE_VISUAL: "0",
      },
    },
  );

  assert.equal(result.status, 0);
  assert.match(result.stderr, /deprecated/i);
  const report = JSON.parse(result.stdout);
  assert.equal(report.slideCount, 1);
});

test("lint-deck supports --report-dir like -v", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-lint-"));
  const reportDir = path.join(tempDir, "report");

  try {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/lint-deck.js",
        "fixtures/clean-slide.md",
        "--report-dir",
        reportDir,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          MARP_AGENT_REQUIRE_VISUAL: "0",
        },
      },
    );

    assert.equal(result.status, 0);
    assert.equal(
      fs.existsSync(path.join(reportDir, "report.json")),
      true,
    );
    assert.equal(fs.existsSync(path.join(reportDir, "report.md")), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("validate-deck --autofix normalizes tiny typography markers", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-validate-"));
  const deckPath = path.join(tempDir, "slide.md");

  try {
    fs.writeFileSync(
      deckPath,
      `---
marp: true
---
# Title

<div class="text-xs3">detail</div>
<small>footnote</small>
`,
    );

    const result = spawnSync(
      process.execPath,
      ["scripts/validate-deck.js", deckPath, "--autofix", "--format", "json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          MARP_AGENT_REQUIRE_VISUAL: "0",
        },
      },
    );

    assert.equal(result.status, 0);
    const updated = fs.readFileSync(deckPath, "utf8");
    assert.equal(updated.includes("text-xs3"), false);
    assert.equal(updated.includes("<small>"), false);
    assert.match(result.stderr, /Applied safe autofixes/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("--autofix --dry-run prints a unified diff without writing", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-validate-"));
  const deckPath = path.join(tempDir, "slide.md");
  const original = `---
marp: true
---
# Title

<div class="text-xs3">detail</div>
`;

  try {
    fs.writeFileSync(deckPath, original);

    const result = spawnSync(
      process.execPath,
      [
        "scripts/validate-deck.js",
        deckPath,
        "--autofix",
        "--dry-run",
        "--format",
        "json",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          MARP_AGENT_REQUIRE_VISUAL: "0",
        },
      },
    );

    assert.equal(result.status, 0);
    assert.equal(fs.readFileSync(deckPath, "utf8"), original);
    assert.match(result.stderr, /--- /);
    assert.match(result.stderr, /\+\+\+ /);
    assert.match(result.stderr, /@@ -\d+,\d+ \+\d+,\d+ @@/);
    assert.match(result.stderr, /-<div class="text-xs3">detail<\/div>/);
    assert.match(result.stderr, /\+<div class="text-sm">detail<\/div>/);
    // stdout keeps the requested output format.
    JSON.parse(result.stdout);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("--dry-run requires --autofix", () => {
  for (const script of ["scripts/validate-deck.js", "scripts/lint-deck.js"]) {
    const result = spawnSync(
      process.execPath,
      [script, "fixtures/clean-slide.md", "--dry-run"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /--dry-run requires --autofix/);
  }
});
