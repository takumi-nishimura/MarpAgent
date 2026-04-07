const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildSarifReport,
  formatSummary,
  splitSlides,
  validateDeckFile,
  validateDeckMarkdown,
  validateDeckWithVisualCheck,
  writeArtifacts,
} = require("../../src/deck-validator");
const { supportsVisualChecks } = require("./helpers/visual-support");

function fixture(name) {
  return path.join(__dirname, "../..", "fixtures", name);
}

test("validator flags dense bullets", () => {
  const markdown = fs.readFileSync(fixture("dense-bullets-slide.md"), "utf8");
  const result = validateDeckMarkdown(markdown);

  assert.equal(result.slideCount, 1);
  assert.equal(
    result.findings.some((finding) => finding.ruleId === "dense-bullets"),
    true,
  );
});

test("validator flags figure-plus-text density", () => {
  const markdown = fs.readFileSync(fixture("figure-heavy-slide.md"), "utf8");
  const result = validateDeckMarkdown(markdown);

  assert.equal(
    result.findings.some((finding) => finding.ruleId === "figure-text-density"),
    true,
  );
});

test("validator flags long heading and overflow risk", () => {
  const markdown = fs.readFileSync(fixture("long-japanese-slide.md"), "utf8");
  const result = validateDeckMarkdown(markdown);

  assert.equal(
    result.findings.some((finding) => finding.ruleId === "long-heading"),
    true,
  );
  assert.equal(
    result.findings.some((finding) => finding.ruleId === "overflow-risk"),
    true,
  );
});

test("validator flags typography drift", () => {
  const markdown = fs.readFileSync(fixture("tiny-text-slide.md"), "utf8");
  const result = validateDeckMarkdown(markdown);

  assert.equal(
    result.findings.some((finding) => finding.ruleId === "typography-drift"),
    true,
  );
});

test("clean slide produces no findings", () => {
  const markdown = fs.readFileSync(fixture("clean-slide.md"), "utf8");
  const result = validateDeckMarkdown(markdown);

  assert.equal(result.slideCount, 1);
  assert.equal(result.findings.length, 0);
});

test("validator flags comparison density", () => {
  const markdown = fs.readFileSync(fixture("comparison-slide.md"), "utf8");
  const result = validateDeckMarkdown(markdown);

  assert.equal(
    result.findings.some(
      (finding) => finding.ruleId === "comparison-overpacked",
    ),
    true,
  );
});

test("splitSlides strips frontmatter and filters empty slides", () => {
  const markdown = "---\ntheme: lab\n---\n# Slide 1\n\n---\n\n---\n\n# Slide 3\n";
  const slides = splitSlides(markdown);

  assert.equal(slides.length, 2);
  assert.match(slides[0].raw, /Slide 1/);
  assert.match(slides[1].raw, /Slide 3/);
  assert.equal(slides[0].number, 1);
  assert.equal(slides[1].number, 3);
});

test("splitSlides does not split on --- inside fenced code blocks", () => {
  const markdown = `---
marp: true
---
# Slide 1

\`\`\`yaml
---
key: value
\`\`\`
`;
  const slides = splitSlides(markdown);

  assert.equal(slides.length, 1);
  assert.equal(slides[0].number, 1);
  assert.match(slides[0].raw, /key: value/);
});

test("formatSummary reports zero findings cleanly", () => {
  const result = { slideCount: 2, findings: [] };
  const summary = formatSummary(null, result);

  assert.match(summary, /stdin/);
  assert.match(summary, /Slides: 2/);
  assert.match(summary, /Findings: 0/);
  assert.equal(summary.includes("[warning]"), false);
});

test("buildSarifReport emits SARIF with rule and result entries", () => {
  const report = buildSarifReport("fixtures/clean-slide.md", {
    slideCount: 1,
    findings: [
      {
        slide: 1,
        ruleId: "dense-bullets",
        severity: "warning",
        title: "Too many bullets.",
        suggestion: "Split across slides.",
      },
    ],
  });

  assert.equal(report.version, "2.1.0");
  assert.equal(report.runs.length, 1);
  assert.equal(report.runs[0].tool.driver.rules.length, 1);
  assert.equal(report.runs[0].results.length, 1);
  assert.equal(report.runs[0].results[0].ruleId, "dense-bullets");
});

test("writeArtifacts returns empty when no reportDir given", () => {
  const result = { slideCount: 1, findings: [] };
  const artifacts = writeArtifacts(result, {});

  assert.deepEqual(artifacts, { reportFiles: [], screenshotFiles: [] });
});

test("validator flags overflow-risk for very long body lines", () => {
  const longLine = "A".repeat(150);
  const markdown = `# Short Title\n\n${longLine}\n`;
  const result = validateDeckMarkdown(markdown);

  assert.equal(
    result.findings.some((f) => f.ruleId === "overflow-risk"),
    true,
  );
});

test("validateDeckWithVisualCheck produces visual-overflow findings for heavy slide", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const deckPath = fixture("overflow-heavy-slide.md");
  const result = await validateDeckWithVisualCheck(deckPath);

  const visualFindings = result.findings.filter(
    (f) => f.ruleId === "visual-overflow",
  );
  assert.equal(
    visualFindings.length > 0,
    true,
    "Should have visual-overflow findings",
  );
  assert.match(visualFindings[0].title, /overflows by/);
});

test("validateDeckWithVisualCheck removes heuristic overflow-risk when visual detects overflow", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const deckPath = fixture("overflow-heavy-slide.md");
  const result = await validateDeckWithVisualCheck(deckPath);

  const overflowRisk = result.findings.filter(
    (f) => f.ruleId === "overflow-risk",
  );
  const visualOverflow = result.findings.filter(
    (f) => f.ruleId === "visual-overflow",
  );

  // If visual overflow detected that slide, heuristic overflow-risk should be removed for it
  for (const vo of visualOverflow) {
    assert.equal(
      overflowRisk.some((or) => or.slide === vo.slide),
      false,
      `overflow-risk should be removed for slide ${vo.slide} when visual-overflow is present`,
    );
  }
});

test("validator writes report artifacts and uses injected screenshot exporter", () => {
  const reportDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "marp-agent-report-"),
  );
  const screenshotPath = path.join(reportDir, "screenshots", "slide-001.png");
  const deckPath = fixture("dense-bullets-slide.md");

  try {
    const result = validateDeckFile(deckPath, {
      reportDir,
      imageExporter: () => {
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        fs.writeFileSync(screenshotPath, "fake image");
        return [screenshotPath];
      },
    });

    const reportJsonPath = path.join(reportDir, "report.json");
    const reportMarkdownPath = path.join(reportDir, "report.md");
    const summary = formatSummary(deckPath, result);

    assert.equal(fs.existsSync(reportJsonPath), true);
    assert.equal(fs.existsSync(reportMarkdownPath), true);
    assert.equal(fs.existsSync(screenshotPath), true);
    assert.match(summary, /Findings:/);
  } finally {
    fs.rmSync(reportDir, { recursive: true, force: true });
  }
});
