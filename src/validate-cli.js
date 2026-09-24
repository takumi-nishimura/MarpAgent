const fs = require("node:fs");
const path = require("node:path");
const { splitFenceSegments } = require("./markdown-slides");
const {
  buildSarifReport,
  exitCodeFor,
  formatSummary,
  validateDeckFile,
  validateDeckWithVisualCheck,
} = require("./deck-validator");

const DEBUG_VALIDATION_LOGS = process.env.MARP_AGENT_DEBUG === "1";

function emitValidationLog(payload) {
  const level = payload.level || "info";
  if (level === "debug" && !DEBUG_VALIDATION_LOGS) return;
  process.stderr.write(`${JSON.stringify(payload)}\n`);
}

const USAGE =
  "Usage: marpx <path/to/slide.md> -v [--report-dir <dir>] [--autofix [--dry-run]] [--strict-visual] [--hints] [--format text|json|sarif]";

function parseArgs(argv) {
  const args = [...argv];
  let deckPath = null;
  let reportDir = null;
  let autofix = false;
  let dryRun = false;
  let strictVisual = process.env.MARP_AGENT_REQUIRE_VISUAL === "1";
  let format = "text";
  let showHints = false;

  const fail = (message) => {
    console.error(USAGE);
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
    if (arg === "--autofix") {
      autofix = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--strict-visual") {
      strictVisual = true;
      continue;
    }
    if (arg === "--hints") {
      showHints = true;
      continue;
    }
    if (arg === "--format") {
      const value = args.shift();
      if (!value || value.startsWith("--")) {
        fail("Option --format requires one of: text, json, sarif.");
      }
      if (!["text", "json", "sarif"].includes(value)) {
        fail(`Unsupported --format value: ${value}`);
      }
      format = value;
      continue;
    }

    if (!deckPath) {
      deckPath = arg;
      continue;
    }

    fail(`Unexpected argument: ${arg}`);
  }

  if (!deckPath) {
    fail("Deck path is required.");
  }
  if (dryRun && !autofix) {
    fail("--dry-run requires --autofix.");
  }

  return {
    deckPath: path.resolve(deckPath),
    reportDir: reportDir ? path.resolve(reportDir) : null,
    autofix,
    dryRun,
    strictVisual,
    format,
    showHints,
  };
}

// Backtick runs open and close inline code spans; the closing run must match
// the opening run's length.
const INLINE_CODE_RE = /(`+)[\s\S]*?\1/g;

function fixTypographyMarkers(text) {
  return (
    text
      // Safe typography fix: lift tiny utility classes to a readable baseline.
      .replace(/\btext-xs2\b/g, "text-sm")
      .replace(/\btext-xs3\b/g, "text-sm")
      // Remove <small> wrappers and keep the text content.
      .replace(/<small>([\s\S]*?)<\/small>/gi, "$1")
  );
}

/**
 * Rewrite only editable text so autofixes never alter code examples: fenced
 * blocks stay untouched via splitFenceSegments, and inline code spans inside
 * the remaining text are skipped as well. Protected text is re-emitted
 * verbatim, so it stays byte-identical.
 */
function applyAutoFixes(markdown) {
  let updated = "";

  for (const segment of splitFenceSegments(markdown)) {
    if (segment.fenced) {
      updated += segment.text;
      continue;
    }
    let offset = 0;
    for (const match of segment.text.matchAll(INLINE_CODE_RE)) {
      updated += fixTypographyMarkers(segment.text.slice(offset, match.index));
      updated += match[0];
      offset = match.index + match[0].length;
    }
    updated += fixTypographyMarkers(segment.text.slice(offset));
  }

  return { markdown: updated, changed: updated !== markdown };
}

const DIFF_CONTEXT_LINES = 3;

/**
 * Build a unified diff between two texts. Deck files are small, so a
 * line-level longest-common-subsequence table keeps this simple.
 */
function unifiedDiff(oldText, newText, filePath) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  const lcs = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        oldLines[i] === newLines[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  // For " " and "-" ops, oldPos is the 1-based old line; for "+" ops it is
  // the old line after which the addition inserts (0 for a file start).
  // newPos is the mirror image for the new text.
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ type: " ", text: oldLines[i], oldPos: i + 1, newPos: j + 1 });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ type: "-", text: oldLines[i], oldPos: i + 1, newPos: j });
      i += 1;
    } else {
      ops.push({ type: "+", text: newLines[j], oldPos: i, newPos: j + 1 });
      j += 1;
    }
  }
  while (i < m) {
    ops.push({ type: "-", text: oldLines[i], oldPos: i + 1, newPos: j });
    i += 1;
  }
  while (j < n) {
    ops.push({ type: "+", text: newLines[j], oldPos: i, newPos: j + 1 });
    j += 1;
  }

  const changedIndexes = [];
  ops.forEach((op, index) => {
    if (op.type !== " ") changedIndexes.push(index);
  });
  if (changedIndexes.length === 0) return "";

  const hunks = [];
  let hunkStart = Math.max(0, changedIndexes[0] - DIFF_CONTEXT_LINES);
  let hunkEnd = Math.min(
    ops.length,
    changedIndexes[0] + DIFF_CONTEXT_LINES + 1,
  );
  for (const changeIndex of changedIndexes.slice(1)) {
    if (changeIndex - DIFF_CONTEXT_LINES <= hunkEnd) {
      hunkEnd = Math.min(ops.length, changeIndex + DIFF_CONTEXT_LINES + 1);
    } else {
      hunks.push(ops.slice(hunkStart, hunkEnd));
      hunkStart = changeIndex - DIFF_CONTEXT_LINES;
      hunkEnd = Math.min(ops.length, changeIndex + DIFF_CONTEXT_LINES + 1);
    }
  }
  hunks.push(ops.slice(hunkStart, hunkEnd));

  const output = [`--- ${filePath}`, `+++ ${filePath}`];
  for (const hunk of hunks) {
    const oldCount = hunk.filter((op) => op.type !== "+").length;
    const newCount = hunk.filter((op) => op.type !== "-").length;
    output.push(
      `@@ -${hunk[0].oldPos},${oldCount} +${hunk[0].newPos},${newCount} @@`,
    );
    for (const op of hunk) {
      output.push(`${op.type}${op.text}`);
    }
  }

  return `${output.join("\n")}\n`;
}

async function runValidationCli(argv) {
  const {
    deckPath,
    reportDir,
    autofix,
    dryRun,
    strictVisual,
    format,
    showHints,
  } = parseArgs(argv);

  try {
    if (autofix) {
      const original = fs.readFileSync(deckPath, "utf8");
      const fixed = applyAutoFixes(original);
      if (fixed.changed) {
        if (dryRun) {
          process.stderr.write(
            `Dry run: safe autofixes would change ${deckPath} (not written).\n`,
          );
          // The diff stays on stderr so stdout keeps the requested format.
          process.stderr.write(unifiedDiff(original, fixed.markdown, deckPath));
        } else {
          fs.writeFileSync(deckPath, fixed.markdown);
          process.stderr.write(`Applied safe autofixes: ${deckPath}\n`);
        }
      } else {
        process.stderr.write("No safe autofix candidates were found.\n");
      }
    }

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
      result = validateDeckFile(deckPath, {
        reportDir,
        visualCheck: { status: "skipped", reason: error.message },
      });
    }

    if (format === "text") {
      process.stdout.write(formatSummary(deckPath, result, { showHints }));

      if (reportDir) {
        for (const filePath of result.artifacts.reportFiles) {
          process.stdout.write(`Artifact: ${filePath}\n`);
        }
        for (const filePath of result.artifacts.screenshotFiles) {
          process.stdout.write(`Screenshot: ${filePath}\n`);
        }
      }
    } else if (format === "json") {
      process.stdout.write(
        `${JSON.stringify(
          {
            deckPath,
            ...result,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stdout.write(
        `${JSON.stringify(buildSarifReport(deckPath, result), null, 2)}\n`,
      );
    }

    process.exit(exitCodeFor(result));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

module.exports = {
  applyAutoFixes,
  parseArgs,
  runValidationCli,
  unifiedDiff,
};
