const { enforceSupportedNodeRuntime } = require("../src/runtime-version");
const { runValidationCli } = require("../src/validate-cli");

enforceSupportedNodeRuntime();

process.stderr.write(
  "Deprecated: --lint is an alias of -v; use `marpx <path/to/slide.md> -v` instead.\n",
);

runValidationCli(process.argv.slice(2));
