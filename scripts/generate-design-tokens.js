#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

const repoRoot = path.resolve(__dirname, "..");
const checkOnly = process.argv.includes("--check");
const allDesigns = process.argv.includes("--all");
const designArgIndex = process.argv.indexOf("--design");
const designName =
  designArgIndex >= 0 ? process.argv[designArgIndex + 1] : "lab";

if (allDesigns && designArgIndex >= 0) {
  console.error(
    "Usage: generate-design-tokens.js [--all | --design <name>] [--check]",
  );
  process.exit(1);
}

if (!allDesigns && (!designName || designName.startsWith("--"))) {
  console.error(
    "Usage: generate-design-tokens.js [--all | --design <name>] [--check]",
  );
  process.exit(1);
}

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

function getOutputPath(name) {
  return path.join(
    repoRoot,
    "themes",
    "src",
    "_generated",
    `${name}-design-tokens.css`,
  );
}

function exportTokens(name) {
  const designPath = path.join(repoRoot, "designs", name, "DESIGN.md");
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
    `/* Generated from designs/${name}/DESIGN.md by scripts/generate-design-tokens.js. Do not edit. */`,
    css.trimEnd(),
    "",
  ].join("\n");
}

function generateOne(name) {
  const outputPath = getOutputPath(name);
  const generated = exportTokens(name);

  if (checkOnly) {
    const current = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, "utf8")
      : "";
    if (current !== generated) {
      console.error(
        `Generated ${name} design tokens are stale. Run \`npm run design:tokens\`.`,
      );
      process.exitCode = 1;
    }
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, generated);
  console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
}

const designNames = allDesigns ? discoverDesigns() : [designName];
for (const name of designNames) generateOne(name);
