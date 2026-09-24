const { enforceSupportedNodeRuntime } = require("../src/runtime-version");
const { runValidationCli } = require("../src/validate-cli");

enforceSupportedNodeRuntime();

runValidationCli(process.argv.slice(2));
