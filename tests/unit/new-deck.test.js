const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts", "new-deck.js");

test("new-deck scaffolds brief and slide templates", () => {
  const deckName = `decks/test-new-deck-${process.pid}-${Date.now()}`;
  const deckDir = path.join(repoRoot, deckName);
  const today = new Date().toISOString().split("T")[0];

  fs.rmSync(deckDir, { recursive: true, force: true });

  try {
    execFileSync(process.execPath, [scriptPath, deckName], {
      cwd: repoRoot,
      env: process.env,
      stdio: "pipe",
    });

    const briefPath = path.join(deckDir, "brief.md");
    const slidePath = path.join(deckDir, "slide.md");
    const sharedPath = path.join(deckDir, "shared");

    assert.equal(fs.existsSync(briefPath), true);
    assert.equal(fs.existsSync(slidePath), true);
    assert.equal(fs.existsSync(path.join(deckDir, "assets", "img")), true);
    assert.equal(
      fs.existsSync(path.join(deckDir, "assets", "video", ".gitkeep")),
      true,
    );

    const brief = fs.readFileSync(briefPath, "utf8");
    const slide = fs.readFileSync(slidePath, "utf8");

    assert.match(brief, /## Audience/);
    assert.match(brief, /## Must-Use Assets/);
    assert.match(brief, new RegExp(`Generated: ${today}`));
    assert.match(slide, new RegExp(`_header: ${today}`));

    const sharedStat = fs.lstatSync(sharedPath);
    if (os.platform() === "win32") {
      assert.equal(sharedStat.isDirectory(), true);
    } else {
      assert.equal(sharedStat.isSymbolicLink(), true);
    }
  } finally {
    fs.rmSync(deckDir, { recursive: true, force: true });
  }
});
