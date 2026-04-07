const fs = require("node:fs");
const path = require("node:path");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");
const {
  buildSarifReport,
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
  const usage =
    "Usage: npx marpx <path/to/slide.md> --lint [--autofix] [--strict-visual] [--format text|json|sarif]";

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
  };
}

function applyAutoFixes(markdown) {
  let updated = markdown;
  let changed = false;

  const replace = (pattern, replacement) => {
    const next = updated.replace(pattern, replacement);
    if (next !== updated) {
      changed = true;
      updated = next;
    }
  };

  // Safe typography fix: lift tiny utility classes to a readable baseline.
  replace(/\btext-xs2\b/g, "text-sm");
  replace(/\btext-xs3\b/g, "text-sm");
  replace(/\btext-xs\b/g, "text-sm");

  // Remove <small> wrappers and keep the text content.
  replace(/<small>([\s\S]*?)<\/small>/gi, "$1");

  return { markdown: updated, changed };
}

async function main() {
  const { deckPath, autofix, strictVisual, format } = parseArgs(process.argv.slice(2));

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
    process.stdout.write(formatSummary(deckPath, result));
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

  process.exit(result.findings.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(2);
});
