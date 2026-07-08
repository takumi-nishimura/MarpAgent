const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
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
    ["--force"],
    ["--no-build"],
  ]) {
    const result = runNodeScript("bin/marpx.js", args);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /can only be used with --theme-new/);
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
