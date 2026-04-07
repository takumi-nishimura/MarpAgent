const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const validateScript = path.join(repoRoot, "scripts", "validate-deck.js");

const passFixtures = [
  "fixtures/clean-slide.md",
  "fixtures/paginate-skip-slide.md",
];
const failFixtures = [
  "fixtures/comparison-slide.md",
];

function runValidation(deckPath) {
  const result = spawnSync(process.execPath, [validateScript, deckPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result.status ?? 1;
}

for (const fixture of passFixtures) {
  const status = runValidation(fixture);
  if (status !== 0) {
    console.error(`Fixture expected to pass failed: ${fixture}`);
    process.exit(1);
  }
}

for (const fixture of failFixtures) {
  const status = runValidation(fixture);
  if (status === 0) {
    console.error(`Fixture expected to fail passed: ${fixture}`);
    process.exit(1);
  }
}

console.log("Fixture validation quality gate passed.");
