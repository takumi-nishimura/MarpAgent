const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  validateDeckWithVisualCheck,
  exitCodeFor,
} = require("../../src/deck-validator");

const repoRoot = path.resolve(__dirname, "../..");

// Regressions: retain measured findings after artifact failures, select the
// available browser for reports, and clean up owned temporary render trees.
function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-failures-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const deckDir = path.join(root, "deck");
  const tempDir = path.join(root, "tmp");
  fs.mkdirSync(deckDir);
  fs.mkdirSync(tempDir);
  const deckPath = path.join(deckDir, "slide.md");
  fs.writeFileSync(deckPath, "---\nmarp: true\n---\n# Example\n");
  return { root, deckPath, tempDir };
}

test("screenshot export failure retains measured findings and writes reports", async (t) => {
  const { root, deckPath } = workspace(t);
  const reportDir = path.join(root, "report");
  const result = await validateDeckWithVisualCheck(deckPath, {
    reportDir,
    measureRenderedSlides: async () => ({
      status: "measured",
      slides: [
        {
          slideNumber: 1,
          clipped: [{ label: "p", edge: "bottom", overflowPx: 12 }],
          maxOverflowPx: 12,
        },
      ],
    }),
    imageExporter: () => {
      throw new Error("Screenshot export failed");
    },
  });
  assert.equal(result.visualCheck.status, "measured");
  assert.ok(
    result.findings.some((finding) => finding.ruleId === "content-clipped"),
  );
  assert.equal(exitCodeFor(result), 2);
  assert.match(result.artifacts.errors[0].message, /Screenshot export failed/);
  const report = JSON.parse(
    fs.readFileSync(path.join(reportDir, "report.json"), "utf8"),
  );
  assert.equal(report.visualCheck.status, "measured");
  assert.deepEqual(report.findings, result.findings);
  assert.deepEqual(report.artifactErrors, result.artifacts.errors);
});

test("CLI report write failure never falls back from measured findings", (t) => {
  const { root, tempDir } = workspace(t);
  const reportDir = path.join(root, "not-a-directory");
  fs.writeFileSync(reportDir, "occupied");
  const result = spawnSync(
    process.execPath,
    [
      "scripts/validate-deck.js",
      "fixtures/scoped-small-text-slide.md",
      "--report-dir",
      reportDir,
      "--format",
      "json",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 60000,
      env: { ...process.env, TMPDIR: tempDir },
    },
  );
  assert.equal(result.status, 2, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.visualCheck.status, "measured");
  assert.ok(
    report.findings.some((finding) => finding.ruleId === "text-too-small"),
  );
  assert.ok(report.artifacts.errors.length > 0);
});

test("failed HTML conversion removes its temporary directory", (t) => {
  const { deckPath, tempDir } = workspace(t);
  fs.mkdirSync(path.join(path.dirname(deckPath), "slide.html"));
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "require('./src/visual-overflow').renderToHtml(process.argv[1])",
      deckPath,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30000,
      env: { ...process.env, TMPDIR: tempDir },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EISDIR/);
  assert.deepEqual(
    fs
      .readdirSync(tempDir)
      .filter((name) => name.startsWith("marp-visual-overflow-")),
    [],
  );
});

test("failed screenshot cleans up before the CLI exits", (t) => {
  const { root, deckPath, tempDir } = workspace(t);
  const result = spawnSync(
    process.execPath,
    ["bin/marpx.js", deckPath, "--screenshot", "1"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30000,
      env: {
        ...process.env,
        TMPDIR: tempDir,
        PLAYWRIGHT_BROWSERS_PATH: path.join(root, "no-browsers"),
      },
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Executable doesn't exist/);
  assert.deepEqual(
    fs
      .readdirSync(tempDir)
      .filter((name) => name.startsWith("marp-visual-overflow-")),
    [],
  );
});
