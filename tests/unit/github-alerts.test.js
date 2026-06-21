const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { Marp } = require("@marp-team/marp-core");

const configPath = path.join(__dirname, "../..", "marp.config.js");

function freshMarp() {
  delete require.cache[path.resolve(configPath)];
  const config = require(configPath);
  const marp = new Marp({ html: config.html ?? true });
  return typeof config.engine === "function"
    ? config.engine({ marp }) || marp
    : marp;
}

function renderBody(markdown) {
  const deck = `---
marp: true
---

${markdown}
`;
  const { html } = freshMarp().render(deck);
  return html;
}

function extractCallout(html, className) {
  const re = new RegExp(
    `<div class="${className}">[\\s\\S]*?</div>`,
    "i",
  );
  const match = html.match(re);
  return match ? match[0] : null;
}

test("renders the five GFM alert types into matching theme classes", () => {
  const types = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
  for (const type of types) {
    const html = renderBody(`> [!${type}]\n> Body for ${type}.`);
    const className = type.toLowerCase();
    const block = extractCallout(html, className);
    assert.ok(block, `expected <div class="${className}"> in output`);
    assert.match(block, new RegExp(`Body for ${type}\\.`));
    assert.doesNotMatch(html, /\[!/);
  }
});

test("supports multi-paragraph alert bodies", () => {
  const html = renderBody(
    "> [!NOTE]\n> First paragraph.\n>\n> Second paragraph.",
  );
  const block = extractCallout(html, "note");
  assert.ok(block);
  assert.match(block, /<p>First paragraph\.<\/p>/);
  assert.match(block, /<p>Second paragraph\.<\/p>/);
});

test("handles an alert with no body content", () => {
  const html = renderBody("> [!WARNING]");
  const block = extractCallout(html, "warning");
  assert.ok(block);
  assert.doesNotMatch(block, /\[!WARNING\]/);
});

test("legacy <div class=\"note\"> form continues to render identically", () => {
  const legacy = renderBody('<div class="note">\n\nLegacy body.\n\n</div>');
  const gfm = renderBody("> [!NOTE]\n> Legacy body.");
  const legacyBlock = extractCallout(legacy, "note");
  const gfmBlock = extractCallout(gfm, "note");
  assert.ok(legacyBlock);
  assert.ok(gfmBlock);
  assert.match(legacyBlock, /Legacy body\./);
  assert.match(gfmBlock, /Legacy body\./);
});

test("ordinary blockquotes without an alert tag pass through unchanged", () => {
  const html = renderBody("> Just a quote, nothing special.");
  assert.match(html, /<blockquote>[\s\S]*Just a quote, nothing special\./);
  assert.doesNotMatch(html, /<div class="(note|tip|important|warning|caution)"/);
});

test("blockquote whose first line is not an alert tag is left alone", () => {
  const html = renderBody("> [!note]\n> lowercase should not match.");
  assert.match(html, /<blockquote>/);
  assert.match(html, /\[!note\]/);
});

test("emits no plugin-internal token types in the final HTML", () => {
  const html = renderBody("> [!TIP]\n> Stays a div.");
  assert.doesNotMatch(html, /github_alert_(open|close)/);
});
