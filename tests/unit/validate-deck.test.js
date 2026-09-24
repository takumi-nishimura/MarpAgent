const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildSarifReport,
  exitCodeFor,
  formatSummary,
  isPaperDeck,
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

test("isPaperDeck detects A-series orientation size directives", () => {
  assert.equal(isPaperDeck("---\nsize: a4-portrait\n---\n# T\n"), true);
  assert.equal(isPaperDeck("---\nsize: a4-landscape\n---\n# T\n"), true);
  assert.equal(isPaperDeck("---\nsize: a3-portrait\n---\n# T\n"), false);
  assert.equal(isPaperDeck("---\nmarp: true\ntheme: poster\n---\n# T\n"), false);
  assert.equal(isPaperDeck("---\nmarp: true\nsize: a0\n---\n# T\n"), false);
  assert.equal(isPaperDeck("---\nsize: a0-portrait\n---\n# T\n"), false);
  assert.equal(isPaperDeck("---\nsize: 16:9\n---\n# T\n"), false);
  assert.equal(isPaperDeck("---\nsize: 4:3\n---\n# T\n"), false);
  assert.equal(isPaperDeck("---\nsize: 400x200\n---\n# T\n"), false);
  assert.equal(isPaperDeck("# No frontmatter\n"), false);
});

test("A-series paper decks skip slide-density heuristics", () => {
  const bullets = Array.from({ length: 15 }, (_, i) => `- item ${i}`).join(
    "\n",
  );
  const heading = "A".repeat(60);
  const paperMarkdown = `---\nmarp: true\ntheme: lab\nsize: a4-portrait\n---\n\n# ${heading}\n\n${bullets}\n`;
  const slideMarkdown = `---\nmarp: true\ntheme: lab\n---\n\n# ${heading}\n\n${bullets}\n`;

  const paperResult = validateDeckMarkdown(paperMarkdown);
  const slideResult = validateDeckMarkdown(slideMarkdown);

  assert.equal(paperResult.paper, true);
  assert.equal(paperResult.findings.length, 0);
  // The same content as a normal slide deck still trips the heuristics.
  assert.equal(slideResult.paper, false);
  assert.equal(slideResult.findings.length > 0, true);
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
  const markdown =
    "---\ntheme: lab\n---\n# Slide 1\n\n---\n\n---\n\n# Slide 3\n";
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

test("bullet-like lines inside fenced code blocks are not counted", () => {
  const yamlBullets = Array.from(
    { length: 9 },
    (_, i) => `- item ${i + 1}`,
  ).join("\n");
  const numberedSteps = Array.from(
    { length: 4 },
    (_, i) => `${i + 1}. step`,
  ).join("\n");
  const fenced = `# Slide

\`\`\`yaml
${yamlBullets}
\`\`\`

~~~markdown
${numberedSteps}
~~~
`;
  const unfenced = `# Slide

${yamlBullets}

${numberedSteps}
`;

  const fencedResult = validateDeckMarkdown(fenced);
  assert.equal(
    fencedResult.findings.some((f) => f.ruleId === "dense-bullets"),
    false,
  );
  assert.equal(
    fencedResult.findings.some((f) => f.ruleId === "overflow-risk"),
    false,
  );

  // The same content outside fences still trips the heuristics.
  const unfencedResult = validateDeckMarkdown(unfenced);
  assert.equal(
    unfencedResult.findings.some((f) => f.ruleId === "dense-bullets"),
    true,
  );
  assert.equal(
    unfencedResult.findings.some((f) => f.ruleId === "overflow-risk"),
    true,
  );
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

test("validateDeckWithVisualCheck reports clipped content on the heavy fixture", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const deckPath = fixture("overflow-heavy-slide.md");
  const result = await validateDeckWithVisualCheck(deckPath);

  assert.equal(result.visualCheck.status, "measured");
  const clipped = result.findings.filter((f) => f.ruleId === "content-clipped");
  assert.equal(clipped.length, 1);
  assert.equal(clipped[0].severity, "error");
  assert.equal(clipped[0].source, "render");
  assert.match(clipped[0].title, /"Point twenty[^"]*" \(bottom \d+px\)/);
  assert.equal(exitCodeFor(result), 1);
});

function measuredStub(slides = []) {
  return async () => ({ status: "measured", slides });
}

function writeTempDeck(markdown) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-validate-"));
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(deckPath, markdown);
  return { dir, deckPath };
}

test("measured decks turn heuristics into hints and drop overflow-risk", async () => {
  // A long single line trips overflow-risk; many bullets trip dense-bullets.
  const bullets = Array.from({ length: 10 }, (_, i) => `- item ${i + 1}`).join("\n");
  const { dir, deckPath } = writeTempDeck(
    `# Short\n\n${"word ".repeat(30)}\n\n---\n\n# Dense\n\n${bullets}\n`,
  );

  try {
    const result = await validateDeckWithVisualCheck(deckPath, {
      measureRenderedSlides: measuredStub([
        { slideNumber: 1, clipped: [], maxOverflowPx: 0 },
        { slideNumber: 2, clipped: [], maxOverflowPx: 0 },
      ]),
    });

    assert.deepEqual(result.visualCheck, { status: "measured" });
    assert.equal(result.findings.some((f) => f.ruleId === "overflow-risk"), false);
    const dense = result.findings.find((f) => f.ruleId === "dense-bullets");
    assert.ok(dense);
    assert.equal(dense.severity, "info");
    assert.equal(dense.source, "heuristic");
    assert.equal(exitCodeFor(result), 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measured clipping becomes a blocking content-clipped error", async () => {
  const { dir, deckPath } = writeTempDeck("# One\n\n---\n\n# Two\n");

  try {
    const result = await validateDeckWithVisualCheck(deckPath, {
      measureRenderedSlides: measuredStub([
        { slideNumber: 1, clipped: [], maxOverflowPx: 0 },
        {
          slideNumber: 2,
          clipped: [
            { label: "<img assets/img/plot.svg>", edge: "bottom", overflowPx: 435 },
            { label: '"caption"', edge: "bottom", overflowPx: 8 },
          ],
          maxOverflowPx: 435,
        },
      ]),
    });

    const [finding] = result.findings;
    assert.equal(result.findings.length, 1);
    assert.equal(finding.slide, 2);
    assert.equal(finding.ruleId, "content-clipped");
    assert.equal(finding.severity, "error");
    assert.match(finding.title, /up to 435px/);
    assert.match(finding.title, /<img assets\/img\/plot\.svg> \(bottom 435px\)/);
    assert.match(finding.title, /"caption" \(bottom 8px\)/);
    assert.equal(exitCodeFor(result), 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measured edge crowding is a non-blocking edge-crowding warning", async () => {
  const { dir, deckPath } = writeTempDeck("# One\n");

  try {
    const result = await validateDeckWithVisualCheck(deckPath, {
      measureRenderedSlides: measuredStub([
        {
          slideNumber: 1,
          clipped: [],
          maxOverflowPx: 0,
          crowded: [{ label: '"last line"', edge: "bottom", gapPx: 4 }],
          safeMarginPx: 20,
        },
      ]),
    });

    const [finding] = result.findings;
    assert.equal(result.findings.length, 1);
    assert.equal(finding.ruleId, "edge-crowding");
    assert.equal(finding.severity, "warning");
    assert.equal(finding.source, "render");
    assert.match(finding.title, /20px safe margin/);
    assert.match(finding.title, /"last line" \(bottom 4px\)/);
    assert.equal(exitCodeFor(result), 0);
    assert.match(
      formatSummary(deckPath, result),
      /\[warning\] slide 1 edge-crowding:/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("measured text below the floor is one blocking text-too-small error per slide", async () => {
  const { dir, deckPath } = writeTempDeck("# One\n\n---\n\n# Two\n");

  try {
    const result = await validateDeckWithVisualCheck(deckPath, {
      measureRenderedSlides: measuredStub([
        {
          slideNumber: 1,
          clipped: [],
          maxOverflowPx: 0,
          smallText: [],
          textFloorPx: { body: 12, secondary: 8 },
        },
        {
          slideNumber: 2,
          clipped: [],
          maxOverflowPx: 0,
          smallText: [
            { label: '"[1] tiny note"', fontPx: 6.4, floorPx: 8, secondary: true },
            { label: '"Scoped body text"', fontPx: 11, floorPx: 12, secondary: false },
          ],
          textFloorPx: { body: 12, secondary: 8 },
        },
      ]),
    });

    assert.equal(result.findings.length, 1);
    const [finding] = result.findings;
    assert.equal(finding.slide, 2);
    assert.equal(finding.ruleId, "text-too-small");
    assert.equal(finding.severity, "error");
    assert.equal(finding.source, "render");
    assert.match(finding.title, /12px body, 8px secondary/);
    assert.match(finding.title, /"\[1\] tiny note" \(6\.4px secondary\)/);
    assert.match(finding.title, /"Scoped body text" \(11px body\)/);
    assert.equal(exitCodeFor(result), 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("typography-drift is superseded by a render and kept as a fallback warning", async () => {
  const deckPath = fixture("tiny-text-slide.md");

  const measured = await validateDeckWithVisualCheck(deckPath, {
    measureRenderedSlides: measuredStub([
      { slideNumber: 1, clipped: [], maxOverflowPx: 0, smallText: [] },
    ]),
  });
  assert.equal(
    measured.findings.some((f) => f.ruleId === "typography-drift"),
    false,
  );

  const skipped = await validateDeckWithVisualCheck(deckPath, {
    measureRenderedSlides: async () => ({
      status: "skipped",
      reason: "Playwright is not installed.",
      slides: [],
    }),
  });
  const drift = skipped.findings.find((f) => f.ruleId === "typography-drift");
  assert.ok(drift);
  assert.equal(drift.severity, "warning");
});

test("skipped visual check keeps heuristics as non-blocking warnings", async () => {
  const bullets = Array.from({ length: 10 }, (_, i) => `- item ${i + 1}`).join("\n");
  const { dir, deckPath } = writeTempDeck(`# Dense\n\n${bullets}\n`);

  try {
    const result = await validateDeckWithVisualCheck(deckPath, {
      measureRenderedSlides: async () => ({
        status: "skipped",
        reason: "Playwright is not installed.",
        slides: [],
      }),
    });

    assert.deepEqual(result.visualCheck, {
      status: "skipped",
      reason: "Playwright is not installed.",
    });
    const dense = result.findings.find((f) => f.ruleId === "dense-bullets");
    assert.equal(dense.severity, "warning");
    assert.equal(exitCodeFor(result), 0);
    assert.match(
      formatSummary(deckPath, result),
      /Visual check: skipped \(Playwright is not installed\.\)/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("missing assets are one blocking error per slide, deduplicated across checks", async () => {
  const { dir, deckPath } = writeTempDeck(
    "# One\n\n<img src=\"assets/img/missing.png\" />\n\n---\n\n# Two\n\n![bg](assets/img/bg.png)\n",
  );
  fs.mkdirSync(path.join(dir, "assets/img"), { recursive: true });
  fs.writeFileSync(path.join(dir, "assets/img/bg.png"), "not an image");

  try {
    const result = await validateDeckWithVisualCheck(deckPath, {
      measureRenderedSlides: measuredStub([
        {
          slideNumber: 1,
          clipped: [],
          maxOverflowPx: 0,
          missingMedia: [
            {
              reference: "assets/img/missing.png",
              reason: "not found",
              path: path.join(dir, "assets/img/missing.png"),
            },
          ],
        },
        {
          slideNumber: 2,
          clipped: [],
          maxOverflowPx: 0,
          missingMedia: [
            {
              reference: "assets/img/bg.png",
              reason: "failed to decode",
              path: path.join(dir, "assets/img/bg.png"),
            },
          ],
        },
      ]),
    });

    const missing = result.findings.filter((f) => f.ruleId === "missing-asset");
    assert.equal(missing.length, 2);
    assert.equal(missing[0].slide, 1);
    assert.equal(missing[0].severity, "error");
    assert.equal(missing[0].source, "files");
    assert.equal(
      missing[0].title.match(/assets\/img\/missing\.png/g).length,
      1,
    );
    assert.match(missing[0].title, /assets\/img\/missing\.png \(not found\)/);
    assert.equal(missing[1].slide, 2);
    assert.equal(missing[1].source, "render");
    assert.match(missing[1].title, /assets\/img\/bg\.png \(failed to decode\)/);
    assert.equal(exitCodeFor(result), 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("missing assets still fail validation when rendering is skipped", async () => {
  const { dir, deckPath } = writeTempDeck(
    "# One\n\n<video src=\"assets/video/missing.mp4\"></video>\n",
  );
  fs.mkdirSync(path.join(dir, "assets/img"), { recursive: true });

  try {
    const skipped = await validateDeckWithVisualCheck(deckPath, {
      measureRenderedSlides: async () => ({
        status: "skipped",
        reason: "Playwright is not installed.",
        slides: [],
      }),
    });
    const fallback = validateDeckFile(deckPath);

    for (const result of [skipped, fallback]) {
      const missing = result.findings.filter((f) => f.ruleId === "missing-asset");
      assert.equal(missing.length, 1);
      assert.equal(missing[0].severity, "error");
      assert.equal(missing[0].source, "files");
      assert.match(missing[0].title, /assets\/video\/missing\.mp4 \(not found\)/);
      assert.equal(exitCodeFor(result), 1);
    }
    assert.match(
      formatSummary(deckPath, skipped),
      /\[error\] slide 1 missing-asset:/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("missing-asset names the target of a broken symlink", async () => {
  const { dir, deckPath } = writeTempDeck(
    "# One\n\n<img src=\"assets/img/linked.png\" />\n",
  );
  fs.mkdirSync(path.join(dir, "assets/img"), { recursive: true });
  fs.symlinkSync("../../../gone/figure.png", path.join(dir, "assets/img/linked.png"));

  try {
    const result = await validateDeckWithVisualCheck(deckPath, {
      measureRenderedSlides: measuredStub([
        { slideNumber: 1, clipped: [], maxOverflowPx: 0 },
      ]),
    });

    const [finding] = result.findings;
    assert.equal(finding.ruleId, "missing-asset");
    assert.match(
      finding.title,
      /assets\/img\/linked\.png \(broken symlink -> \.\.\/\.\.\/\.\.\/gone\/figure\.png\)/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("rendered and file checks report a missing image once", async (t) => {
  if (!(await supportsVisualChecks())) {
    t.skip("Visual overflow checks are unavailable in this environment.");
    return;
  }

  const { dir, deckPath } = writeTempDeck(
    "---\nmarp: true\ntheme: lab\n---\n\n# Broken\n\n<img src=\"assets/img/missing.png\" />\n<img src=\"assets/img/corrupt.png\" />\n",
  );
  fs.mkdirSync(path.join(dir, "assets/img"), { recursive: true });
  fs.writeFileSync(path.join(dir, "assets/img/corrupt.png"), "not an image");

  try {
    const result = await validateDeckWithVisualCheck(deckPath);

    assert.equal(result.visualCheck.status, "measured");
    const missing = result.findings.filter((f) => f.ruleId === "missing-asset");
    assert.equal(missing.length, 1);
    assert.equal(missing[0].source, "files");
    assert.equal(missing[0].title.match(/missing\.png/g).length, 1);
    assert.match(missing[0].title, /assets\/img\/missing\.png \(not found\)/);
    assert.match(missing[0].title, /assets\/img\/corrupt\.png \(failed to decode\)/);
    assert.equal(exitCodeFor(result), 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("formatSummary hides hints unless requested", () => {
  const result = {
    slideCount: 1,
    visualCheck: { status: "measured" },
    findings: [
      {
        slide: 1,
        ruleId: "dense-bullets",
        severity: "info",
        source: "heuristic",
        title: "Slide contains 10 top-level bullet items.",
        suggestion: "Split the list.",
      },
    ],
  };

  const hidden = formatSummary(null, result);
  assert.match(hidden, /Visual check: measured/);
  assert.match(hidden, /Findings: 0 \(errors: 0, warnings: 0\)/);
  assert.match(hidden, /Hints: 1/);
  assert.equal(hidden.includes("dense-bullets"), false);
  assert.match(hidden, /--hints/);

  const shown = formatSummary(null, result, { showHints: true });
  assert.match(shown, /\[hint\] slide 1 dense-bullets:/);
});

test("reports record the visual check and screenshot only non-hint slides", () => {
  const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-report-"));
  let requestedSlides;

  try {
    const result = {
      slideCount: 2,
      visualCheck: { status: "measured" },
      findings: [
        { slide: 1, ruleId: "dense-bullets", severity: "info", source: "heuristic", title: "t", suggestion: "s" },
        { slide: 2, ruleId: "content-clipped", severity: "error", source: "render", title: "t", suggestion: "s" },
      ],
    };
    writeArtifacts(result, {
      deckPath: "deck/slide.md",
      reportDir,
      imageExporter: ({ slideNumbers }) => {
        requestedSlides = slideNumbers;
        return [];
      },
    });

    const report = JSON.parse(fs.readFileSync(path.join(reportDir, "report.json"), "utf8"));
    const markdown = fs.readFileSync(path.join(reportDir, "report.md"), "utf8");
    assert.deepEqual(requestedSlides, [2]);
    assert.deepEqual(report.visualCheck, { status: "measured" });
    assert.deepEqual(report.counts, { errors: 1, warnings: 0, hints: 1 });
    assert.match(markdown, /Visual check: measured/);
    assert.match(markdown, /## Hints/);
  } finally {
    fs.rmSync(reportDir, { recursive: true, force: true });
  }
});

test("buildSarifReport records the visual check and maps hints to notes", () => {
  const report = buildSarifReport("deck/slide.md", {
    slideCount: 1,
    visualCheck: { status: "skipped", reason: "no browser" },
    findings: [
      { slide: 1, ruleId: "dense-bullets", severity: "info", source: "heuristic", title: "t", suggestion: "s" },
    ],
  });

  assert.deepEqual(report.runs[0].properties.visualCheck, {
    status: "skipped",
    reason: "no browser",
  });
  assert.equal(report.runs[0].results[0].level, "note");
  assert.equal(report.runs[0].results[0].properties.source, "heuristic");
});

test("dense-bullets on multi-column slide reports per-column breakdown", () => {
  const fourBullets = ["- a", "- b", "- c", "- d"].join("\n");
  const fiveBullets = ["- a", "- b", "- c", "- d", "- e"].join("\n");
  const markdown = `# Comparison

<div class="col">
<div>

${fourBullets}

</div>
<div>

${fourBullets}

</div>
<div>

${fiveBullets}

</div>
</div>
`;
  const result = validateDeckMarkdown(markdown);
  const finding = result.findings.find((f) => f.ruleId === "dense-bullets");

  assert.ok(finding, "expected dense-bullets finding on multi-column slide");
  assert.match(finding.title, /\(4\+4\+5 across 3 columns\)/);
});

test("dense-bullets keeps single-list message when slide is not multi-column", () => {
  const bullets = Array.from({ length: 10 }, (_, i) => `- item ${i + 1}`).join(
    "\n",
  );
  const markdown = `# Single list\n\n${bullets}\n`;
  const result = validateDeckMarkdown(markdown);
  const finding = result.findings.find((f) => f.ruleId === "dense-bullets");

  assert.ok(finding);
  assert.match(finding.title, /Slide contains 10 top-level bullet items\./);
  assert.equal(finding.title.includes("across"), false);
});

test("overflow-risk message names the threshold that tripped", () => {
  const longLine = "A".repeat(150);
  const markdown = `# Short\n\n${longLine}\n`;
  const result = validateDeckMarkdown(markdown);
  const finding = result.findings.find((f) => f.ruleId === "overflow-risk");

  assert.ok(finding);
  assert.match(finding.title, /single line 150 chars/);
});

test("overflow-risk identifies callout source for long line", () => {
  const longSentence =
    "This callout body is intentionally extremely long so that it crosses the 140-character single-line threshold inside a GFM alert block to test the source attribution.";
  const markdown = `# Slide

> [!CAUTION]
> ${longSentence}
`;
  const result = validateDeckMarkdown(markdown);
  const finding = result.findings.find((f) => f.ruleId === "overflow-risk");

  assert.ok(finding);
  assert.match(finding.title, /\(callout body\)/);
});

test("typography-drift message names the offending class", () => {
  const markdown = `# Slide

<div class="text-xs2">

shrunk content

</div>
`;
  const result = validateDeckMarkdown(markdown);
  const finding = result.findings.find((f) => f.ruleId === "typography-drift");

  assert.ok(finding);
  assert.match(finding.title, /\.text-xs2/);
});

test("validator allows the supported text-xs utility", () => {
  const markdown = `# Slide

<div class="text-xs">

caption-sized but supported content

</div>
`;
  const result = validateDeckMarkdown(markdown);

  assert.equal(
    result.findings.some((f) => f.ruleId === "typography-drift"),
    false,
  );
});

test("figure-text-density message names the contributing count", () => {
  const bullets = Array.from({ length: 7 }, (_, i) => `- item ${i + 1}`).join(
    "\n",
  );
  const markdown = `# Slide

![](shared/img/fig.png)

${bullets}
`;
  const result = validateDeckMarkdown(markdown);
  const finding = result.findings.find(
    (f) => f.ruleId === "figure-text-density",
  );

  assert.ok(finding);
  assert.match(finding.title, /7 bullets/);
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
