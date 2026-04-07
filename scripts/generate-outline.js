const path = require("node:path");
const { generateOutlineFile } = require("../src/outline");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

function parseArgs(argv) {
  const args = [...argv];
  let briefPath = null;
  let outputPath = null;
  const usage =
    "Usage: npx marpx <path/to/brief.md> --outline [--output <path/to/outline.md>]";
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

    if (!briefPath) {
      briefPath = arg;
    }
  }

  if (!briefPath) {
    fail("Brief path is required.");
  }

  return {
    briefPath: path.resolve(briefPath),
    outputPath: outputPath ? path.resolve(outputPath) : null,
  };
}

function main() {
  const { briefPath, outputPath } = parseArgs(process.argv.slice(2));
  const resolvedOutputPath =
    outputPath || path.join(path.dirname(briefPath), "outline.md");
  generateOutlineFile(briefPath, resolvedOutputPath);
  console.log(`Wrote outline: ${resolvedOutputPath}`);
}

main();
