const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { buildOutlineMarkdown, parseBrief } = require("../../src/outline");

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
