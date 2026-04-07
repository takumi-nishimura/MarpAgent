const path = require("node:path");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");
const {
  formatSummary,
  validateDeckFile,
  validateDeckWithVisualCheck,
} = require("../src/deck-validator");

enforceSupportedNodeRuntime();

const DEBUG_VALIDATION_LOGS = process.env.MARP_AGENT_DEBUG === "1";

function emitValidationLog(payload) {
  const level = payload.level || "info";
  if (level === "debug" && !DEBUG_VALIDATION_LOGS) return;
  process.stderr.write(`${JSON.stringify(payload)}\n`);
}

function parseArgs(argv) {
  const args = [...argv];
  let deckPath = null;
  let reportDir = null;
  let strictVisual = process.env.MARP_AGENT_REQUIRE_VISUAL === "1";
  const usage =
    "Usage: npx marpx <path/to/slide.md> -v [--report-dir <dir>] [--strict-visual]";
  const fail = (message) => {
    console.error(usage);
    console.error(message);
    process.exit(1);
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--report-dir") {
      const value = args.shift();
      if (!value || value.startsWith("--")) {
        fail("Option --report-dir requires a directory path.");
      }
      reportDir = value;
      continue;
    }
    if (arg === "--strict-visual") {
      strictVisual = true;
      continue;
    }

    if (!deckPath) {
      deckPath = arg;
    }
  }

  if (!deckPath) {
    fail("Deck path is required.");
  }

  return {
    deckPath: path.resolve(deckPath),
    reportDir: reportDir ? path.resolve(reportDir) : null,
    strictVisual,
  };
}

async function main() {
  const { deckPath, reportDir, strictVisual } = parseArgs(process.argv.slice(2));

  try {
    let result;
    try {
      result = await validateDeckWithVisualCheck(deckPath, {
        reportDir,
        strictVisual,
        onDiagnostic: (diagnostic) => {
          emitValidationLog({
            component: "deck-validator",
            deckPath,
            ...diagnostic,
          });
        },
      });
    } catch (error) {
      if (strictVisual) {
        emitValidationLog({
          component: "deck-validator",
          level: "error",
          event: "strict-visual-failed",
          deckPath,
          errorName: error.name,
          errorCode: error.code,
          errorMessage: error.message,
        });
        throw error;
      }
      emitValidationLog({
        component: "deck-validator",
        level: "warning",
        event: "visual-validation-threw",
        deckPath,
        errorName: error.name,
        errorMessage: error.message,
      });
      emitValidationLog({
        component: "deck-validator",
        level: "warning",
        event: "heuristic-fallback",
        deckPath,
        reason: "validateDeckWithVisualCheck-threw",
      });
      emitValidationLog({
        component: "deck-validator",
        level: "debug",
        event: "visual-validation-stack",
        deckPath,
        stack: error.stack,
      });
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
