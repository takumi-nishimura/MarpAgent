const path = require("node:path");
const { generateOutlineFile } = require("../src/outline");

function parseArgs(argv) {
  const args = [...argv];
  let briefPath = null;
  let outputPath = null;

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--output") {
      outputPath = args.shift();
      continue;
    }

    if (!briefPath) {
      briefPath = arg;
    }
  }

  if (!briefPath) {
    console.error(
      "Usage: npm run outline -- <path/to/brief.md> [--output <path/to/outline.md>]",
    );
    process.exit(1);
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
