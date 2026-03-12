const path = require("node:path");
const {
  formatSummary,
  validateDeckFile,
  validateDeckWithVisualCheck,
} = require("../src/deck-validator");

function parseArgs(argv) {
  const args = [...argv];
  let deckPath = null;
  let reportDir = null;

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--report-dir") {
      reportDir = args.shift();
      continue;
    }

    if (!deckPath) {
      deckPath = arg;
    }
  }

  if (!deckPath) {
    console.error(
      "Usage: npm run deck:validate -- <path/to/slide.md> [--report-dir <dir>]",
    );
    process.exit(1);
  }

  return {
    deckPath: path.resolve(deckPath),
    reportDir: reportDir ? path.resolve(reportDir) : null,
  };
}

async function main() {
  const { deckPath, reportDir } = parseArgs(process.argv.slice(2));

  try {
    let result;
    try {
      result = await validateDeckWithVisualCheck(deckPath, { reportDir });
    } catch {
      result = validateDeckFile(deckPath, { reportDir });
    }

    process.stdout.write(formatSummary(deckPath, result));

    if (reportDir) {
      for (const filePath of result.artifacts.reportFiles) {
        process.stdout.write(`Artifact: ${filePath}\n`);
      }
      for (const filePath of result.artifacts.screenshotFiles) {
        process.stdout.write(`Screenshot: ${filePath}\n`);
      }
    }

    process.exit(result.findings.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

main();
