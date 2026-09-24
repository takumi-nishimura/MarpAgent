const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

function runNodeScript(scriptPath, args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
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
