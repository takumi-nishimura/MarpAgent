const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const validateScript = path.join(repoRoot, "scripts", "validate-deck.js");

// Expected validator behavior per fixture (ADR-0001):
// - errors: rule IDs of measured, blocking findings (render only);
// - warnings: rule IDs of measured, non-blocking findings (render only);
// - hints: rule IDs of source heuristics, reported as hints after a render
//   or as warnings when rendering is unavailable;
// - fallbackHints: rule IDs of source heuristics reported only when rendering
//   is unavailable, because a render supersedes them (`overflow-risk`,
//   `typography-drift`).
const expectations = [
  { fixture: "fixtures/clean-slide.md", errors: [], hints: [] },
  { fixture: "fixtures/paginate-skip-slide.md", errors: [], hints: [] },
  { fixture: "fixtures/muji-slide.md", errors: [], hints: [] },
  { fixture: "fixtures/toshiba-slide.md", errors: [], hints: [] },
  {
    fixture: "fixtures/comparison-slide.md",
    errors: [],
    hints: ["comparison-overpacked"],
  },
  {
    fixture: "fixtures/dense-bullets-slide.md",
    errors: [],
    hints: ["dense-bullets"],
  },
  {
    fixture: "fixtures/figure-heavy-slide.md",
    errors: [],
    hints: ["figure-text-density"],
  },
  {
    fixture: "fixtures/long-japanese-slide.md",
    errors: [],
    hints: ["long-heading"],
    fallbackHints: ["overflow-risk"],
  },
  {
    // `<small>` renders at 20.8px, well above the body floor, so only the
    // source fallback mentions it.
    fixture: "fixtures/tiny-text-slide.md",
    errors: [],
    hints: [],
    fallbackHints: ["typography-drift"],
  },
  {
    // A scoped <style> shrinks the body below the floor; the source
    // heuristic cannot see it.
    fixture: "fixtures/scoped-small-text-slide.md",
    errors: ["text-too-small"],
    hints: [],
  },
  {
    fixture: "fixtures/overflow-heavy-slide.md",
    errors: ["content-clipped"],
    warnings: ["edge-crowding"],
    hints: ["dense-bullets"],
    fallbackHints: ["overflow-risk"],
  },
];
const strictVisual = process.env.MARP_AGENT_REQUIRE_VISUAL === "1";

function runValidation(deckPath) {
  const args = [validateScript, deckPath, "--format", "json"];
  if (strictVisual) {
    args.push("--strict-visual");
  }

  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status === 2 || !result.stdout) {
    console.error(`Validation did not complete for ${deckPath}.`);
    process.exit(1);
  }

  return { status: result.status, report: JSON.parse(result.stdout) };
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

if (strictVisual) {
  console.log("Fixture validation running in strict visual mode.");
}

let failures = 0;

for (const {
  fixture,
  errors,
  warnings = [],
  hints,
  fallbackHints = [],
} of expectations) {
  const { status, report } = runValidation(fixture);
  const measured = report.visualCheck?.status === "measured";
  const expectedHints = sortedUnique(
    measured ? hints : [...hints, ...fallbackHints],
  );
  const actualErrors = sortedUnique(
    report.findings.filter((f) => f.severity === "error").map((f) => f.ruleId),
  );
  const actualWarnings = sortedUnique(
    report.findings
      .filter((f) => f.source === "render" && f.severity === "warning")
      .map((f) => f.ruleId),
  );
  const actualHints = sortedUnique(
    report.findings
      .filter((f) => f.source === "heuristic")
      .map((f) => f.ruleId),
  );
  const problems = [];

  if (JSON.stringify(actualHints) !== JSON.stringify(expectedHints)) {
    problems.push(
      `heuristics ${JSON.stringify(actualHints)} != ${JSON.stringify(expectedHints)}`,
    );
  }
  if (measured) {
    if (JSON.stringify(actualErrors) !== JSON.stringify(sortedUnique(errors))) {
      problems.push(
        `errors ${JSON.stringify(actualErrors)} != ${JSON.stringify(sortedUnique(errors))}`,
      );
    }
    if (
      JSON.stringify(actualWarnings) !== JSON.stringify(sortedUnique(warnings))
    ) {
      problems.push(
        `warnings ${JSON.stringify(actualWarnings)} != ${JSON.stringify(sortedUnique(warnings))}`,
      );
    }
    const expectedStatus = errors.length > 0 ? 1 : 0;
    if (status !== expectedStatus) {
      problems.push(`exit ${status} != ${expectedStatus}`);
    }
  } else {
    console.log(
      `${fixture}: visual check skipped; only heuristics were compared.`,
    );
  }

  if (problems.length > 0) {
    failures += 1;
    console.error(`${fixture}: ${problems.join("; ")}`);
  } else {
    console.log(`${fixture}: ok`);
  }
}

if (failures > 0) {
  console.error(
    `Fixture validation quality gate failed (${failures} fixture(s)).`,
  );
  process.exit(1);
}

console.log("Fixture validation quality gate passed.");
