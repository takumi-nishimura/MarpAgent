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

const fixturePath = path.join(
  __dirname,
  "../..",
  "fixtures",
  "good-brief.md",
);

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
  assert.equal(brief.coreMessage[0], "One-sentence takeaway: Keep the deck focused.");
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
