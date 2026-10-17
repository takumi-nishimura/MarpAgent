#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

const repoRoot = path.resolve(__dirname, "..");

function getDesignmdBin() {
  const binName = process.platform === "win32" ? "designmd.cmd" : "designmd";
  return path.join(repoRoot, "node_modules", ".bin", binName);
}

function discoverDesigns() {
  const designsDir = path.join(repoRoot, "designs");
  return fs
    .readdirSync(designsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) =>
      fs.existsSync(path.join(designsDir, name, "DESIGN.md")),
    )
    .sort();
}

function lintDesigns() {
  let failed = false;
  for (const name of discoverDesigns()) {
    const designPath = path.join("designs", name, "DESIGN.md");
    const result = spawnSync(getDesignmdBin(), ["lint", designPath], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) {
      console.error(`Cannot run ${getDesignmdBin()}: ${result.error.message}`);
      failed = true;
      continue;
    }

    if (result.status !== 0) {
      failed = true;
      continue;
    }

    try {
      const report = JSON.parse(result.stdout);
      if (report.summary.errors > 0 || report.summary.warnings > 0) {
        failed = true;
      }
    } catch (error) {
      console.error(`Invalid designmd report for ${designPath}: ${error.message}`);
      failed = true;
    }
  }
  return failed ? 1 : 0;
}

try {
  process.exitCode = lintDesigns();
} catch (error) {
  console.error(`Failed to lint designs: ${error.message}`);
  process.exitCode = 1;
}
