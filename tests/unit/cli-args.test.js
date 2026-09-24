const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

function runNodeScript(scriptPath, args, timeout = 30000) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout,
  });
}

test("validate-deck fails when --report-dir value is missing", () => {
  const result = runNodeScript("scripts/validate-deck.js", [
    "fixtures/clean-slide.md",
    "--report-dir",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Option --report-dir requires a directory path\./);
});

test("generate-outline fails when --output value is missing", () => {
  const result = runNodeScript("scripts/generate-outline.js", [
    "fixtures/good-brief.md",
    "--output",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Option --output requires a file path\./);
});

test("marpx export modes are mutually exclusive", () => {
  for (const args of [
    ["fixtures/clean-slide.md", "--pdf", "--pptx"],
    ["fixtures/clean-slide.md", "--pdf", "--html"],
    ["fixtures/clean-slide.md", "--pptx", "--images", "png"],
    ["fixtures/clean-slide.md", "--html", "--screenshot", "1"],
    ["fixtures/clean-slide.md", "--images", "png", "--lint"],
  ]) {
    const result = runNodeScript("bin/marpx.js", args);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /conflicting options/);
  }
});

test("marpx --images rejects an unsupported format", () => {
  const result = runNodeScript("bin/marpx.js", [
    "fixtures/clean-slide.md",
    "--images",
    "gif",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--images must be "png" or "jpeg"/);
});

test("marpx --images defaults to png and requires a file", () => {
  const result = runNodeScript("bin/marpx.js", ["--images"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /file path required for --images/);
});

test("marpx --output requires an export, screenshot, or outline mode", () => {
  for (const args of [
    ["fixtures/clean-slide.md", "--output", "out.html"],
    ["fixtures/clean-slide.md", "--lint", "--output", "out.html"],
  ]) {
    const result = runNodeScript("bin/marpx.js", args);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /--output can only be used with/);
  }
});

test("marpx --pdf requires a file path", () => {
  const result = runNodeScript("bin/marpx.js", ["--pdf"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /file path required for --pdf/);
});

test("marpx --paper requires --new", () => {
  const result = runNodeScript("bin/marpx.js", [
    "decks/foo/paper.md",
    "--paper",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--paper can only be used with --new/);
});

test("marpx --poster reports replacement", () => {
  const result = runNodeScript("bin/marpx.js", [
    "-n",
    "decks/foo",
    "--poster",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--poster has been replaced by --paper/);
});

test("marpx theme scaffold options require --theme-new", () => {
  for (const args of [
    ["--source-url", "https://example.com/design"],
    ["--no-build"],
  ]) {
    const result = runNodeScript("bin/marpx.js", args);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /can only be used with --theme-new/);
  }
});

test("marpx --force requires --new, --theme-new, or --outline", () => {
  const result = runNodeScript("bin/marpx.js", ["--force"]);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /--force can only be used with --new, --theme-new, or --outline/,
  );
});

test("marpx --outline refuses to overwrite an existing outline without --force", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-outline-"));
  const briefPath = path.join(tempDir, "brief.md");
  const outlinePath = path.join(tempDir, "outline.md");

  try {
    fs.copyFileSync(
      path.join(repoRoot, "fixtures", "good-brief.md"),
      briefPath,
    );
    fs.writeFileSync(outlinePath, "hand-edited outline\n");

    const refused = runNodeScript("bin/marpx.js", [briefPath, "--outline"]);

    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /refusing to overwrite/);
    assert.match(refused.stderr, /--force/);
    assert.match(refused.stderr, /--output/);
    assert.equal(
      fs.readFileSync(outlinePath, "utf8"),
      "hand-edited outline\n",
    );

    const forced = runNodeScript("bin/marpx.js", [
      briefPath,
      "--outline",
      "--force",
    ]);

    assert.equal(forced.status, 0, forced.stderr);
    const outline = fs.readFileSync(outlinePath, "utf8");
    assert.match(outline, /# Outline/);
    assert.equal(outline.includes("hand-edited outline"), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("marpx --theme-new forwards scaffold options", () => {
  const themeName = `test-theme-${process.pid}-${Date.now()}`;
  const cleanupPaths = [
    path.join(repoRoot, "designs", themeName),
    path.join(repoRoot, "themes", "src", `${themeName}.css`),
    path.join(repoRoot, "fixtures", `${themeName}-slide.md`),
  ];

  for (const targetPath of cleanupPaths) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  try {
    const result = runNodeScript("bin/marpx.js", [
      "--theme-new",
      themeName,
      "--source-url",
      "https://example.com/design",
      "--no-build",
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const design = fs.readFileSync(
      path.join(repoRoot, "designs", themeName, "DESIGN.md"),
      "utf8",
    );
    assert.match(design, /Scaffold source: https:\/\/example\.com\/design/);
  } finally {
    for (const targetPath of cleanupPaths) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
  }
});
