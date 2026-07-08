const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "../..");

test("Mermaid theme CSS exposes sizing custom properties", () => {
  for (const relativePath of [
    "themes/src/_shared/_layouts.css",
    "themes/src/poster.css",
    "themes/lab.css",
    "themes/poster.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(css, /--mermaid-width/);
    assert.match(css, /--mermaid-max-width/);
    assert.match(css, /--mermaid-max-height/);
    assert.match(css, /--mermaid-overflow/);
    assert.match(css, /flex:\s*0 0 auto/);
  }
});

test("title logo background sizing defaults to height-based and remains overridable", () => {
  for (const relativePath of [
    "themes/src/_shared/_base.css",
    "themes/lab.css",
  ]) {
    const css = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(
      css,
      /--logo-title-background-size:\s*auto 50px/,
    );
    assert.match(
      css,
      /section\.title header\s*\{[\s\S]*background-size:[\s\S]*var\(--logo-title-background-size\)/,
    );
    assert.match(
      css,
      /section:not\(\.title\) header::after\s*\{[\s\S]*background-size:[\s\S]*auto var\(--logo-header-size\)/,
    );
  }
});
