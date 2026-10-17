const test = require("node:test");
const assert = require("node:assert/strict");
const { splitFenceSegments } = require("../../src/markdown-slides");

test("indented code does not start a fence that hides later top-level content", () => {
  for (const indent of ["    ", "\t", " \t"]) {
    const source = `${indent}\`\`\`js\n\n- Visible bullet\n`;
    assert.deepEqual(splitFenceSegments(source), [{ text: source, fenced: false }]);
  }
});

test("fences allow up to three spaces and retain their matching close rules", () => {
  const code = "   ````js\n- Code bullet\n```\n    ````\n   ````\n";
  assert.deepEqual(splitFenceSegments(`${code}- Visible bullet\n`), [
    { text: code, fenced: true },
    { text: "- Visible bullet\n", fenced: false },
  ]);
});

test("backticks in an opening fence info string are ordinary Markdown", () => {
  const source = "```some`text\n- Visible bullet\n";
  assert.deepEqual(splitFenceSegments(source), [{ text: source, fenced: false }]);
});
