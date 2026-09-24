const path = require("node:path");
const { generateOutlineFile } = require("../src/outline");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

function parseArgs(argv) {
  const args = [...argv];
  let briefPath = null;
  let outputPath = null;
  let strictBrief = true;
  let force = false;
  const usage =
    "Usage: marpx <path/to/brief.md> --outline [--output <path/to/outline.md>] [--force] [--no-strict-brief]";
  const fail = (message) => {
    console.error(usage);
    console.error(message);
    process.exit(1);
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--output") {
      const value = args.shift();
      if (!value || value.startsWith("--")) {
        fail("Option --output requires a file path.");
      }
      outputPath = value;
      continue;
    }
    if (arg === "--no-strict-brief") {
      strictBrief = false;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }

    if (!briefPath) {
      briefPath = arg;
      continue;
    }

    fail(`Unexpected argument: ${arg}`);
  }

  if (!briefPath) {
    fail("Brief path is required.");
  }

  return {
    briefPath: path.resolve(briefPath),
    outputPath: outputPath ? path.resolve(outputPath) : null,
    strictBrief,
    force,
  };
}

function main() {
  const { briefPath, outputPath, strictBrief, force } = parseArgs(
    process.argv.slice(2),
  );
  const resolvedOutputPath =
    outputPath || path.join(path.dirname(briefPath), "outline.md");
  try {
    generateOutlineFile(briefPath, resolvedOutputPath, { strictBrief, force });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  console.log(`Wrote outline: ${resolvedOutputPath}`);
}

main();
