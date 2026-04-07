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
<small>footnote</small>
`,
    );

    const result = spawnSync(
      process.execPath,
      ["scripts/lint-deck.js", deckPath, "--autofix", "--format", "json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0);
    const updated = fs.readFileSync(deckPath, "utf8");
    assert.equal(updated.includes("text-xs3"), false);
    assert.equal(updated.includes("<small>"), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
