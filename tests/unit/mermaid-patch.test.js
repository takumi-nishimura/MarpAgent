const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  applyBeautifulMermaidPatch,
  assertSupportedBeautifulMermaidVersion,
} = require("../../src/mermaid-patch");

test("version guard accepts the currently supported beautiful-mermaid version", () => {
  const packageJsonPath = resolvePackageJsonPath(require.resolve("beautiful-mermaid"));
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  assert.doesNotThrow(() => {
    assertSupportedBeautifulMermaidVersion(packageJson.version);
  });
});

test("version guard rejects unsupported beautiful-mermaid versions", () => {
  assert.throws(() => {
    assertSupportedBeautifulMermaidVersion("1.0.0");
  }, /Unsupported beautiful-mermaid version/);
});

test("patch canary applies CJK width patch to the current source", () => {
  const modulePath = require.resolve("beautiful-mermaid");
  const source = fs.readFileSync(modulePath, "utf8");
  const patched = applyBeautifulMermaidPatch(source);

  assert.equal(typeof patched.patched, "boolean");
  assert.equal(typeof patched.reason, "string");
  assert.equal(typeof patched.source, "string");

  if (patched.patched) {
    assert.match(patched.source, /function _effectiveLength\(text\)/);
    assert.match(
      patched.source,
      /return _effectiveLength\(text\) \* fontSize \* widthRatio;/,
    );
    assert.match(
      patched.source,
      /return _effectiveLength\(text\) \* fontSize \* 0\.6;/,
    );
  }
});

test("patch canary fails fast when source markers drift", () => {
  const driftedSource = "function estimateTextWidth() { return 0; }";

  assert.throws(() => {
    applyBeautifulMermaidPatch(driftedSource);
  }, /Patch canary failed: missing marker/);
});

function resolvePackageJsonPath(entryPath) {
  let dir = path.dirname(entryPath);
  const root = path.parse(dir).root;

  while (dir !== root) {
    const candidate = path.join(dir, "package.json");
    if (fs.existsSync(candidate)) {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (parsed.name === "beautiful-mermaid") {
        return candidate;
      }
    }
    dir = path.dirname(dir);
  }

  throw new Error("Could not resolve beautiful-mermaid package.json from module entry path.");
}
