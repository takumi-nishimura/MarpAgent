const fs = require("node:fs");
const path = require("node:path");
const { HTML_PART_RE, parseSource } = require("./markdown-source");
const {
  buildSarifReport,
  exitCodeFor,
  formatSummary,
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

/** Apply edits only to parsed HTML, preserving all other source bytes. */
function applyAutoFixes(markdown) {
  const edits = [];
  const literalTags = [];
  for (const fragment of parseSource(markdown)) {
    if (fragment.type !== "html") continue;
    for (const match of fragment.content.matchAll(HTML_PART_RE)) {
      const tag = match[0];
      if (tag.startsWith("<!--") || match[1]) continue;
      const literal = tag.match(/^<(\/?)(script|style|textarea|pre|code)\b/i);
      if (literal) {
        if (!literal[1]) literalTags.push(literal[2].toLowerCase());
        else if (literalTags.at(-1) === literal[2].toLowerCase()) literalTags.pop();
        continue;
      }
      if (literalTags.length) continue;
      const start = fragment.position(match.index);
      const end = fragment.position(match.index + tag.length);
      if (start === null || end === null) continue;
      const original = markdown.slice(start, end);
      let replacement = original;
      if (/^<\/?small\s*>$/i.test(tag)) {
        replacement = "";
      } else {
        // Tokenize every attribute so 'class' inside a title is not edited.
        replacement = original.replace(/(\s+)([^\s=<>]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/g,
          (attribute, space, name, equals, value) => {
            if (name.toLowerCase() !== "class") return attribute;
            const quote = /^["']/.test(value) ? value[0] : "";
            const body = quote ? value.slice(1, -1) : value;
            const fixed = body.replace(/(^|\s)text-xs[23](?=\s|$)/g, "$1text-sm");
            return space + name + equals + quote + fixed + quote;
          });
      }
      if (replacement !== original) edits.push({ start, end, replacement });
    }
  }
  let updated = markdown;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    updated = updated.slice(0, edit.start) + edit.replacement + updated.slice(edit.end);
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
      }
      // Browser unavailability is handled by measureRenderedSlides. An
      // unrelated validation failure must never replace measured findings.
      throw error;
    }
    for (const error of result.artifacts?.errors || []) {
      emitValidationLog({
        component: "deck-validator",
        level: "error",
        event: "artifact-output-failed",
        deckPath,
        ...error,
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
