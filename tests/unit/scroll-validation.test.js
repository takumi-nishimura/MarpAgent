const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  validateDeckWithVisualCheck,
  exitCodeFor,
} = require("../../src/deck-validator");
const { measureRenderedSlides } = require("../../src/visual-overflow");
const { supportsVisualChecks } = require("./helpers/visual-support");

const fixture = path.join(__dirname, "../../fixtures/scroll-slide.md");

async function writeDeck(t, markdown) {
  if (!(await supportsVisualChecks())) {
    t.skip("Chromium is unavailable in this environment.");
    return null;
  }
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "marpagent-scroll-validation-"),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "slide.md");
  fs.writeFileSync(file, markdown);
  return file;
}

async function validateCopy(t, extra = "") {
  const file = await writeDeck(
    t,
    fs
      .readFileSync(fixture, "utf8")
      .replace(
        "End of the scrollable body.",
        `End of the scrollable body.\n\n${extra}`,
      ),
  );
  if (!file) return null;
  return validateDeckWithVisualCheck(file, { strictVisual: true });
}

// Validate once in strict mode and keep the measurement the validator used,
// so a test can check both the raw audit and the reported findings.
async function validateAndMeasure(file) {
  let measurement;
  const result = await validateDeckWithVisualCheck(file, {
    strictVisual: true,
    measureRenderedSlides: async (...args) => {
      measurement = await measureRenderedSlides(...args);
      return measurement;
    },
  });
  return { result, measurement };
}

function sampleTable(prefix, count) {
  const rows = Array.from(
    { length: count },
    (_, index) => `| ${prefix} ${index + 1} | ${index + 1} |`,
  );
  return ["| Sample | Value |", "| :----- | ----: |", ...rows].join("\n");
}

const FRONT_MATTER = "---\nmarp: true\ntheme: lab\npaginate: true\n---\n";

test("intentional vertical scrolling warns about static exports without failing presentation validation", async (t) => {
  const result = await validateCopy(t);
  if (!result) return;
  assert.equal(result.visualCheck.status, "measured");
  const warnings = result.findings.filter(
    (finding) => finding.ruleId === "scroll-export-overflow",
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].slide, 1);
  assert.equal(warnings[0].severity, "warning");
  assert.equal(warnings[0].source, "render");
  assert.equal(
    result.findings.filter((finding) => finding.severity === "error").length,
    0,
  );
  assert.equal(exitCodeFor(result), 0);
});

test("validation reaches math errors and tiny text below the initial scroll viewport", async (t) => {
  const result = await validateCopy(
    t,
    '$\\frac{$\n\n<p style="font-size:6px">Small text below the fold</p>',
  );
  if (!result) return;
  const rules = result.findings
    .filter((finding) => finding.severity === "error")
    .map((finding) => finding.ruleId);
  assert.ok(rules.includes("math-render-error"));
  assert.ok(rules.includes("text-too-small"));
  assert.equal(exitCodeFor(result), 1);
});

test("vertical scrolling does not hide horizontal clipping", async (t) => {
  const result = await validateCopy(
    t,
    '<div style="width:2000px;white-space:nowrap">This body is wider than the slide</div>',
  );
  if (!result) return;
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.ruleId === "content-clipped" && finding.severity === "error",
    ),
  );
  assert.equal(exitCodeFor(result), 1);
});

test("validation finds defects in the middle of a long scrollable body and counts each occurrence once", async (t) => {
  // The same malformed formula appears at the top, the middle, and the bottom
  // of the body; the tiny note sits only in the middle, between equal tables.
  const file = await writeDeck(
    t,
    `${FRONT_MATTER}
<!-- _scroll: true -->

## Long body with repeated errors

$\\frac{$

${sampleTable("Upper", 30)}

$\\frac{$

<p style="font-size:6px">Tiny middle note</p>

${sampleTable("Lower", 30)}

$\\frac{$

End of the scrollable body.
`,
  );
  if (!file) return;
  const { result, measurement } = await validateAndMeasure(file);
  assert.equal(measurement.status, "measured");
  assert.equal(measurement.slides.length, 1);
  const [slide] = measurement.slides;
  // Precondition: the middle lies below the first viewport and above the last.
  assert.ok(slide.scrollable, "the opted-in slide should be scrollable");
  assert.ok(
    slide.scrollable.contentHeight > 3 * slide.scrollable.viewportHeight,
    `body ${slide.scrollable.contentHeight}px is too short for viewport ${slide.scrollable.viewportHeight}px`,
  );

  const mathErrors = slide.renderErrors.filter(
    (error) => error.kind === "math",
  );
  assert.equal(mathErrors.length, 1);
  assert.equal(mathErrors[0].count, 3);
  assert.ok(
    slide.smallText.some((item) => item.label.includes("Tiny middle note")),
  );

  const mathFinding = result.findings.find(
    (finding) => finding.ruleId === "math-render-error",
  );
  assert.ok(mathFinding);
  assert.equal(mathFinding.slide, 1);
  assert.match(mathFinding.title, /in 3 places/);
  const smallFinding = result.findings.find(
    (finding) => finding.ruleId === "text-too-small",
  );
  assert.ok(smallFinding);
  assert.match(smallFinding.title, /Tiny middle note/);
  assert.equal(exitCodeFor(result), 1);
});

test("scroll findings in a mixed deck map to the Markdown slide, rendered position, and displayed page", async (t) => {
  // Slide 2 is hidden and carries its own scrollable body and defects, so a
  // mapping that counted it would report them or shift the later slides.
  const file = await writeDeck(
    t,
    `${FRONT_MATTER}
# Opening

A normal first slide.

---

<!-- _hide: true -->
<!-- _scroll: true -->

## Hidden backup

$\\frac{$

<p style="font-size:6px">Hidden tiny note</p>

${sampleTable("Hidden", 40)}

---

<!-- _scroll: true -->

## Scrollable results

${sampleTable("Upper", 30)}

<p style="font-size:6px">Scrolled tiny note</p>

${sampleTable("Lower", 30)}

---

## Closing

$\\frac{$
`,
  );
  if (!file) return;
  const { result, measurement } = await validateAndMeasure(file);
  assert.deepEqual(
    measurement.slides.map((slide) => [
      slide.slideNumber,
      slide.renderedSlide,
      Boolean(slide.scrollable),
    ]),
    [
      [1, 1, false],
      [3, 2, true],
      [4, 3, false],
    ],
  );

  const tracked = new Set([
    "scroll-export-overflow",
    "text-too-small",
    "math-render-error",
  ]);
  const located = result.findings
    .filter((finding) => finding.source === "render")
    .filter((finding) => tracked.has(finding.ruleId))
    .map((finding) => ({
      ruleId: finding.ruleId,
      slide: finding.slide,
      renderedSlide: finding.renderedSlide,
      page: finding.page,
    }))
    .sort((a, b) => a.slide - b.slide || a.ruleId.localeCompare(b.ruleId));
  assert.deepEqual(located, [
    {
      ruleId: "scroll-export-overflow",
      slide: 3,
      renderedSlide: 2,
      page: 2,
    },
    { ruleId: "text-too-small", slide: 3, renderedSlide: 2, page: 2 },
    { ruleId: "math-render-error", slide: 4, renderedSlide: 3, page: 3 },
  ]);
  assert.ok(
    !result.findings.some(
      (finding) => finding.source === "render" && finding.slide === 2,
    ),
  );
  const smallFinding = result.findings.find(
    (finding) => finding.ruleId === "text-too-small",
  );
  assert.match(smallFinding.title, /Scrolled tiny note/);
  assert.doesNotMatch(smallFinding.title, /Hidden tiny note/);
  const mathFinding = result.findings.find(
    (finding) => finding.ruleId === "math-render-error",
  );
  assert.doesNotMatch(mathFinding.title, /in \d+ places/);
});

test("an opted-in body that fits its viewport does not warn about static exports", async (t) => {
  const file = await writeDeck(
    t,
    `${FRONT_MATTER}
<!-- _scroll: true -->

## Short scrollable body

One sentence fits in the first viewport.
`,
  );
  if (!file) return;
  const { result, measurement } = await validateAndMeasure(file);
  assert.equal(measurement.status, "measured");
  // The opt-in took effect, so the absence of a warning is not vacuous.
  assert.ok(measurement.slides[0].scrollable);
  assert.ok(
    !result.findings.some(
      (finding) => finding.ruleId === "scroll-export-overflow",
    ),
  );
  assert.equal(
    result.findings.filter((finding) => finding.severity === "error").length,
    0,
  );
  assert.equal(exitCodeFor(result), 0);
});
