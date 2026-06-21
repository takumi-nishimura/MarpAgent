const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

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

test("new-deck --poster scaffolds a single poster template", () => {
  const deckName = `decks/test-new-poster-${process.pid}-${Date.now()}`;
  const deckDir = path.join(repoRoot, deckName);

  fs.rmSync(deckDir, { recursive: true, force: true });

  try {
    execFileSync(process.execPath, [scriptPath, deckName, "--poster"], {
      cwd: repoRoot,
      env: process.env,
      stdio: "pipe",
    });

    const posterPath = path.join(deckDir, "poster.md");

    assert.equal(fs.existsSync(posterPath), true);
    // A poster deck has no brief/slide/outline.
    assert.equal(fs.existsSync(path.join(deckDir, "brief.md")), false);
    assert.equal(fs.existsSync(path.join(deckDir, "slide.md")), false);
    assert.equal(fs.existsSync(path.join(deckDir, "assets", "img")), true);

    const poster = fs.readFileSync(posterPath, "utf8");
    assert.match(poster, /theme: poster/);
    assert.match(poster, /size: a0/);
    assert.match(poster, /class="poster-columns"/);

    // Scaffold should not preload a highlight card — that placeholder used to
    // push authors into adding a hero number even when one wasn't warranted.
    assert.equal(poster.includes("poster-section highlight"), false);
    assert.equal(poster.includes("poster-stat"), false);

    // Authoring guidance now lives in a sibling README.md, not in body HTML
    // comments inside the rendered poster.
    const bodyAfterFrontmatter = poster
      .split(/^---\s*$/m)
      .slice(2)
      .join("---");
    assert.equal(
      /<!--[\s\S]*?-->/.test(bodyAfterFrontmatter),
      false,
      "scaffolded poster body should contain no HTML comments",
    );

    const readmePath = path.join(deckDir, "README.md");
    assert.equal(fs.existsSync(readmePath), true);
    const readme = fs.readFileSync(readmePath, "utf8");
    assert.match(readme, /A0 poster/);
    assert.match(readme, /Highlight card/);
  } finally {
    fs.rmSync(deckDir, { recursive: true, force: true });
  }
});

test("new-deck rejects path traversal outside decks directory", () => {
  const result = spawnSync(process.execPath, [scriptPath, "../tmp/escape"], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be inside decks\//);
});

test("new-deck rejects absolute paths", () => {
  const absolutePath = path.join(os.tmpdir(), `marpx-abs-${Date.now()}`);
  const result = spawnSync(process.execPath, [scriptPath, absolutePath], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be inside decks\//);
});
