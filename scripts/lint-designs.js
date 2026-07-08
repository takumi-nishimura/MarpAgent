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

let failed = false;
for (const name of discoverDesigns()) {
  const designPath = path.join("designs", name, "DESIGN.md");
  const result = spawnSync(getDesignmdBin(), ["lint", designPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    failed = true;
    continue;
  }

  const report = JSON.parse(result.stdout);
  if (report.summary.errors > 0 || report.summary.warnings > 0) {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
