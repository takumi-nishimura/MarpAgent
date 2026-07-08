#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

const repoRoot = path.resolve(__dirname, "..");
const checkOnly = process.argv.includes("--check");
const designArgIndex = process.argv.indexOf("--design");
const designName =
  designArgIndex >= 0 ? process.argv[designArgIndex + 1] : "lab";

if (!designName || designName.startsWith("--")) {
  console.error("Usage: generate-design-tokens.js [--design <name>] [--check]");
  process.exit(1);
}

const designPath = path.join(repoRoot, "designs", designName, "DESIGN.md");
const outputPath = path.join(
  repoRoot,
  "themes",
  "src",
  "_generated",
  `${designName}-design-tokens.css`,
);

function getDesignmdBin() {
  const binName = process.platform === "win32" ? "designmd.cmd" : "designmd";
  return path.join(repoRoot, "node_modules", ".bin", binName);
}

function exportTokens() {
  const css = execFileSync(
    getDesignmdBin(),
    ["export", "--format", "css-tailwind", designPath],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );

  return [
    `/* Generated from designs/${designName}/DESIGN.md by scripts/generate-design-tokens.js. Do not edit. */`,
    css.trimEnd(),
    "",
  ].join("\n");
}

const generated = exportTokens();

if (checkOnly) {
  const current = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8")
    : "";
  if (current !== generated) {
    console.error(
      `Generated ${designName} design tokens are stale. Run \`npm run design:tokens\`.`,
    );
    process.exit(1);
  }
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generated);
console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
