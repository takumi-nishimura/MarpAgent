const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runValidation } = require("../../scripts/lib/validation-process");

test("fixture validation accepts reports larger than the default child buffer", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-large-report-"));
  const script = path.join(root, "validator.js");
  try {
    fs.writeFileSync(
      script,
      "process.stdout.write(JSON.stringify({findings: [], diagnostic: 'x'.repeat(2 * 1024 * 1024)}));",
    );
    const { status, report } = runValidation({
      repoRoot: root,
      validateScript: script,
      deckPath: "fixture.md",
    });
    assert.equal(status, 0);
    assert.equal(report.diagnostic.length, 2 * 1024 * 1024);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fixture validation diagnoses process and JSON failures before comparing findings", () => {
  const options = {
    repoRoot: __dirname,
    validateScript: "validator.js",
    deckPath: "example.md",
  };
  assert.throws(
    () =>
      runValidation({
        ...options,
        run: () => ({
          status: null,
          stdout: '{"findings":',
          error: Object.assign(new Error("output too large"), {
            code: "ENOBUFS",
          }),
        }),
      }),
    /example\.md.*ENOBUFS/,
  );
  assert.throws(
    () =>
      runValidation({
        ...options,
        run: () => ({ status: 0, stdout: "invalid JSON" }),
      }),
    /Invalid validator JSON for example\.md/,
  );
  assert.throws(
    () =>
      runValidation({
        ...options,
        run: () => ({ status: null, signal: "SIGTERM", stdout: "{}" }),
      }),
    /example\.md.*SIGTERM/,
  );
});

test("strict fixture validation rejects unmeasured reports even with exit zero", () => {
  assert.throws(
    () =>
      runValidation({
        repoRoot: __dirname,
        validateScript: "validator.js",
        deckPath: "example.md",
        strictVisual: true,
        run: () => ({
          status: 0,
          stdout: JSON.stringify({
            findings: [],
            visualCheck: { status: "skipped" },
          }),
        }),
      }),
    /Strict visual validation requires a measured report for example\.md/,
  );
});
