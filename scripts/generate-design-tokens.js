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
  if (!fs.existsSync(designPath)) {
    throw new Error(`Design file not found: ${designPath}`);
  }
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

const coverTokens = {
  lab: ["color-strong-ink", "color-muted-ink"],
  muji: [
    "color-muji-red", "color-kinari", "color-beige", "color-background",
    "color-text-primary", "color-text-secondary", "color-text-tertiary",
    "color-border", "spacing-slide-x", "spacing-logo-title-size",
  ],
  toshiba: [
    "color-light-blue", "spacing-slide-x", "spacing-logo-title-size",
    "spacing-line-width", "spacing-accent-bar-width", "spacing-title-heading-top",
    "spacing-title-heading-inset", "spacing-title-subtitle-top",
    "spacing-title-copy-width", "spacing-title-stripe-start",
    "spacing-title-stripe-light-end", "spacing-title-stripe-blue-end",
    "spacing-title-stripe-red-end", "font-weight-label-md",
  ],
};

const commonCoverTokens = [
  "color-primary", "color-secondary", "color-tertiary", "color-neutral",
  "color-on-primary", "color-on-surface", "color-accent-strong",
  "color-muted-invert", "color-highlight-invert", "color-emphasis",
  "font-body-md", "text-body-md", "text-display", "leading-display",
  "tracking-display", "font-weight-display",
];

function exportCoverTokens(name, designCss) {
  const values = new Map();
  require("postcss").parse(designCss).walkDecls(/^--/, ({ prop, value }) => {
    values.set(prop, value);
  });
  const declarations = [...commonCoverTokens, ...coverTokens[name]].map((token) => {
    const property = `--${token}`;
    const value = values.get(property) ?? (token === "leading-display" ? "initial" : undefined);
    if (value === undefined) throw new Error(`Missing ${name} cover token ${property}`);
    return `  ${property}: ${value};`;
  });
  return [
    designCss.split("\n", 1)[0],
    `section.title:where(.cover-${name}:not(.cover-plain, .cover-photo, :has(> .paper-header))) {`,
    ...declarations,
    "}",
    "",
  ].join("\n");
}

function writeGeneratedFile(outputPath, generated) {
  if (checkOnly) {
    const current = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, "utf8")
      : "";
    if (current !== generated) {
      console.error(
        `Generated ${path.basename(outputPath)} is stale. Run \`npm run design:tokens\`.`,
      );
      process.exitCode = 1;
    }
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, generated);
  console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
}

function generateOne(name) {
  const outputPath = getOutputPath(name);
  const designCss = exportTokens(name);
  const coverCss = Object.hasOwn(coverTokens, name) ? exportCoverTokens(name, designCss) : "";
  writeGeneratedFile(outputPath, designCss);
  if (coverCss) {
    const coverPath = path.join(path.dirname(outputPath), `${name}-cover-tokens.css`);
    writeGeneratedFile(coverPath, coverCss);
  }
}

try {
  const designNames = allDesigns ? discoverDesigns() : [designName];
  for (const name of designNames) generateOne(name);
} catch (error) {
  console.error(`Failed to generate design tokens: ${error.message}`);
  process.exitCode = 1;
}
