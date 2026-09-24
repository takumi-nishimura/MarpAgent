const fs = require("node:fs");
const path = require("node:path");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");
const { splitFenceSegments } = require("../src/markdown-slides");
const {
  buildSarifReport,
  exitCodeFor,
  formatSummary,
  validateDeckWithVisualCheck,
} = require("../src/deck-validator");

enforceSupportedNodeRuntime();

function parseArgs(argv) {
  const args = [...argv];
  let deckPath = null;
  let autofix = false;
  let strictVisual = process.env.MARP_AGENT_REQUIRE_VISUAL === "1";
  let format = "text";
  let showHints = false;
  const usage =
    "Usage: marpx <path/to/slide.md> --lint [--autofix] [--strict-visual] [--hints] [--format text|json|sarif]";

  const fail = (message) => {
    console.error(usage);
    console.error(message);
    process.exit(1);
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--autofix") {
      autofix = true;
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

  return {
    deckPath: path.resolve(deckPath),
    autofix,
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

async function main() {
  const { deckPath, autofix, strictVisual, format, showHints } = parseArgs(
    process.argv.slice(2),
  );

  if (autofix) {
    const original = fs.readFileSync(deckPath, "utf8");
    const fixed = applyAutoFixes(original);
    if (fixed.changed) {
      fs.writeFileSync(deckPath, fixed.markdown);
      process.stderr.write(`Applied safe autofixes: ${deckPath}\n`);
    } else {
      process.stderr.write("No safe autofix candidates were found.\n");
    }
  }

  const result = await validateDeckWithVisualCheck(deckPath, {
    strictVisual,
  });

  if (format === "text") {
    process.stdout.write(formatSummary(deckPath, result, { showHints }));
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
}

main().catch((error) => {
  console.error(error.message);
  process.exit(2);
});
