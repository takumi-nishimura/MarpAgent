const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildOutlineMarkdown,
  generateOutlineFile,
  parseBrief,
  validateBriefSchema,
} = require("../../src/outline");

const fixturePath = path.join(__dirname, "../..", "fixtures", "good-brief.md");

test("outline builder emits slide plan with required fields", () => {
  const brief = parseBrief(fs.readFileSync(fixturePath, "utf8"));
  const outline = buildOutlineMarkdown(brief, {
    generatedDate: "2026-03-06",
    sourcePath: "good-brief.md",
  });

  assert.match(outline, /# Outline/);
  assert.match(outline, /## Slide Plan/);
  assert.match(outline, /- Title:/);
  assert.match(outline, /- Takeaway:/);
  assert.match(outline, /- Layout hint:/);
  assert.match(outline, /- Overflow risk:/);
  assert.match(outline, /Brief schema/);
  assert.match(outline, /Validation and review loop/);
});

test("parseBrief supports Japanese heading aliases", () => {
  const brief = parseBrief(`## 対象者
- Platform team

## 所要時間
- 15 min

## コアメッセージ
- One-sentence takeaway: Keep the deck focused.

## 期待アクション
- Adopt the proposed process.

## 必須セクション
- 背景
- 計画
`);

  assert.deepEqual(brief.audience, ["Platform team"]);
  assert.deepEqual(brief.duration, ["15 min"]);
  assert.equal(
    brief.coreMessage[0],
    "One-sentence takeaway: Keep the deck focused.",
  );
  assert.equal(brief.audienceAction[0], "Adopt the proposed process.");
  assert.deepEqual(brief.requiredSections, ["背景", "計画"]);
});

test("validateBriefSchema reports missing required sections", () => {
  const validation = validateBriefSchema({
    audience: ["A"],
    duration: [],
    coreMessage: [],
    audienceAction: [],
    requiredSections: [],
  });

  assert.equal(validation.ok, false);
  assert.match(validation.message, /Duration/);
  assert.match(validation.message, /Required Sections/);
});

test("outline does not duplicate Title slide when brief lists Title in Required Sections", () => {
  const brief = parseBrief(`## Audience
- A
## Duration
- 10 min
## Core Message
- One-sentence takeaway: T
## Audience Action
- Act
## Required Sections
- Title
- Agenda
- Problem
- Solution
`);
  const outline = buildOutlineMarkdown(brief, {
    generatedDate: "2026-06-21",
    sourcePath: "brief.md",
  });

  assert.equal(outline.includes("Opening promise"), false);
  const titleSlideCount = (outline.match(/^- Title: Title$/gm) || []).length;
  assert.equal(titleSlideCount, 1, "expected exactly one Title slide");
  const agendaCount = (outline.match(/^- Title: Agenda$/gm) || []).length;
  assert.equal(agendaCount, 1, "expected exactly one Agenda slide");
});

test("outline maps Title-aliased section to the title layout", () => {
  const brief = parseBrief(`## Audience
- A
## Duration
- 10 min
## Core Message
- One-sentence takeaway: T
## Audience Action
- Act
## Required Sections
- Title
- Body
`);
  const outline = buildOutlineMarkdown(brief, {
    generatedDate: "2026-06-21",
    sourcePath: "brief.md",
  });

  const titleBlock = outline.match(
    /### Slide \d+: Title\n\n- Title: Title\n- Takeaway:.*\n- Layout hint: (.+)\n/,
  );
  assert.ok(titleBlock, "expected a Title slide block");
  assert.equal(titleBlock[1], "title");
});

test("outline carries bracketed variant hint from required-section text", () => {
  const brief = parseBrief(`## Audience
- A
## Duration
- 10 min
## Core Message
- One-sentence takeaway: T
## Audience Action
- Act
## Required Sections
- Three-vendor comparison [multi-column]
- Closing (closing variant)
`);
  const outline = buildOutlineMarkdown(brief, {
    generatedDate: "2026-06-21",
    sourcePath: "brief.md",
  });

  assert.match(outline, /Layout hint: two-column \(multi-column variant\)/);
  assert.match(outline, /Layout hint: content \(closing variant\)/);
  // Variant markers should be stripped from the displayed Title
  assert.match(outline, /- Title: Three-vendor comparison\n/);
  assert.match(outline, /- Title: Closing\n/);
});

test("outline carries 'using the X variant' prose variant hint", () => {
  const brief = parseBrief(`## Audience
- A
## Duration
- 10 min
## Core Message
- One-sentence takeaway: T
## Audience Action
- Act
## Required Sections
- Feature grid of trade-offs using the feature-grid variant
`);
  const outline = buildOutlineMarkdown(brief, {
    generatedDate: "2026-06-21",
    sourcePath: "brief.md",
  });

  assert.match(outline, /Layout hint: two-column \(feature-grid variant\)/);
});

test("outline carries newer layout hints and strips their markers", () => {
  const brief = parseBrief(`## Audience
- A
## Duration
- 10 min
## Core Message
- One-sentence takeaway: T
## Audience Action
- Act
## Required Sections
- Evidence snapshot [metric-grid]
- Rollout sequence (timeline)
- Demo walkthrough using the visual variant
`);
  const outline = buildOutlineMarkdown(brief, {
    generatedDate: "2026-06-21",
    sourcePath: "brief.md",
  });

  assert.match(outline, /Layout hint: content \(metric-grid variant\)/);
  assert.match(outline, /Layout hint: content \(timeline variant\)/);
  assert.match(outline, /Layout hint: two-column \(visual variant\)/);
  assert.match(outline, /- Title: Evidence snapshot\n/);
  assert.match(outline, /- Title: Rollout sequence\n/);
});

test("generateOutlineFile rejects incomplete brief by default", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-outline-"));
  const briefPath = path.join(tempDir, "brief.md");
  const outputPath = path.join(tempDir, "outline.md");

  try {
    fs.writeFileSync(briefPath, "## Audience\n- A\n");
    assert.throws(
      () => generateOutlineFile(briefPath, outputPath),
      /Brief is missing required sections/,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
