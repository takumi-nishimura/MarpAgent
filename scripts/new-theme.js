#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

const THEME_NAME_RE = /^[a-z][a-z0-9-]{0,62}$/;

function usage() {
  return [
    "Usage: node scripts/new-theme.js <name> [--source-url <url>] [--force] [--no-build]",
    "",
    "Scaffolds designs/<name>/DESIGN.md, themes/src/<name>.css, and fixtures/<name>-slide.md.",
  ].join("\n");
}

function parseArgs(argv) {
  const args = [...argv];
  let name = null;
  let sourceUrl = "";
  let force = false;
  let build = true;

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--source-url") {
      const value = args.shift();
      if (!value || value.startsWith("--")) {
        throw new Error("Option --source-url requires a URL.");
      }
      sourceUrl = value;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--no-build") {
      build = false;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unsupported option: ${arg}`);
    }
    if (name) throw new Error(`Unexpected argument: ${arg}`);
    name = arg;
  }

  if (!name) throw new Error("Theme name is required.");
  return { name: normalizeThemeName(name), sourceUrl, force, build };
}

function normalizeThemeName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!THEME_NAME_RE.test(normalized)) {
    throw new Error(
      "Theme name must match /^[a-z][a-z0-9-]{0,62}$/ (lowercase letters, digits, hyphens).",
    );
  }
  if (normalized.includes("--") || normalized.endsWith("-")) {
    throw new Error("Theme name must not contain repeated or trailing hyphens.");
  }
  return normalized;
}

function ensureWritable(targetPath, force) {
  if (!fs.existsSync(targetPath)) return;
  if (force) return;
  throw new Error(`Refusing to overwrite existing path: ${targetPath}`);
}

function writeFile(targetPath, content, force) {
  ensureWritable(targetPath, force);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content);
}

function titleCaseName(name) {
  return name
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function replaceRequired(content, pattern, replacement, label) {
  const next = content.replace(pattern, replacement);
  if (next === content) {
    throw new Error(`Failed to replace ${label} in lab DESIGN.md scaffold.`);
  }
  return next;
}

function buildDesignContent(repoRoot, name, sourceUrl = "") {
  const labDesignPath = path.join(repoRoot, "designs", "lab", "DESIGN.md");
  if (!fs.existsSync(labDesignPath)) {
    throw new Error(`Missing base design scaffold: ${path.relative(repoRoot, labDesignPath)}`);
  }

  const title = titleCaseName(name);
  const sourceLine = sourceUrl
    ? `Scaffold source: ${sourceUrl}. Replace this note with extracted design rationale before finalizing the theme.`
    : "Replace this scaffold note with the source design rationale before finalizing the theme.";
  const overview = [
    "## Overview",
    "",
    sourceLine,
    "",
    `${title} is a MarpAgent design scaffold. Replace this overview with source-derived audience, tone, and authoring constraints before using the theme for production decks.`,
    "",
    "Keep the token schema complete while editing so shared slide and A-series paper components continue to compile.",
    "",
    "## Colors",
  ].join("\n");

  let design = fs.readFileSync(labDesignPath, "utf8");
  design = replaceRequired(design, /^name: .+$/m, `name: ${title}`, "name");
  design = replaceRequired(
    design,
    /^description: .+$/m,
    `description: ${title} presentation design system for MarpAgent slides and A-series paper layouts.`,
    "description",
  );
  design = replaceRequired(design, /^# .+ Design$/m, `# ${title} Design`, "title");
  design = replaceRequired(
    design,
    /## Overview\n\n[\s\S]*?\n\n## Colors/,
    overview,
    "overview",
  );

  return design
    .replace(
      "Utility colors preserve the existing lab theme vocabulary",
      "Utility colors preserve MarpAgent's shared theme vocabulary",
    )
    .replace(
      "The current lab slide system is mostly square and utilitarian.",
      "This scaffold starts from a mostly square and utilitarian component system.",
    );
}

function themeCssTemplate(name) {
  return `/*!
 * @theme ${name}
 * @size 16:9 1280px 720px
 * @size 4:3 1024px 768px
 * @size a4-portrait 210mm 297mm
 * @size a4-landscape 297mm 210mm
 */
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap");
@import "tailwindcss" source(none);
@source "../../decks/**/*.md";
@source "../../fixtures/**/*.md";
@source "../../.agents/skills/**/*.md";

@import "./_generated/${name}-design-tokens.css";
@import "./_shared/_base.css";
@import "./_shared/_colors.css";
@import "./_shared/_typography.css";
@import "./_shared/_layouts.css";
@import "./_shared/_paper.css";
@import "./_shared/_callouts.css";
@import "./_shared/_code.css";
@import "./_shared/_colorschemes.css";

section {
  --fg: var(--color-on-surface);
  --bg: var(--color-neutral);
  --fg-muted: var(--color-secondary);
  --highlight: var(--color-accent-strong);
  --gradient-mid: color-mix(in srgb, var(--highlight) 40%, var(--bg));
  --bg-gray-5: var(--color-surface-muted);
  --color-em: var(--color-emphasis);
  --color-strong: var(--color-accent-strong);
  --padding-x: var(--spacing-slide-x);
  --header-height: var(--spacing-header-height);
  --logo-title-size: var(--spacing-logo-title-size);
  --logo-header-size: var(--spacing-logo-header-size);
}
`;
}

function fixtureTemplate(name) {
  const title = titleCaseName(name);
  return `---
marp: true
theme: ${name}
paginate: true
---

# ${title} Theme

Smoke test slide for \`theme: ${name}\`.

---

<!-- _header: Theme Smoke -->

## Components

- DESIGN.md token source
- Generated Tailwind tokens
- Shared MarpAgent components
`;
}

function createThemeFiles(options) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, "..");
  const name = normalizeThemeName(options.name);
  const sourceUrl = options.sourceUrl || "";
  const force = Boolean(options.force);

  const files = [
    {
      path: path.join(repoRoot, "designs", name, "DESIGN.md"),
      content: buildDesignContent(repoRoot, name, sourceUrl),
    },
    {
      path: path.join(repoRoot, "themes", "src", `${name}.css`),
      content: themeCssTemplate(name),
    },
    {
      path: path.join(repoRoot, "fixtures", `${name}-slide.md`),
      content: fixtureTemplate(name),
    },
  ];

  for (const file of files) writeFile(file.path, file.content, force);
  return files.map((file) => file.path);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(usage());
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, "..");
  try {
    const files = createThemeFiles({ repoRoot, ...args });
    for (const filePath of files) {
      console.log(`Created ${path.relative(repoRoot, filePath)}`);
    }
    if (args.build) {
      run(
        process.execPath,
        [path.join(__dirname, "generate-design-tokens.js"), "--design", args.name],
        repoRoot,
      );
      run(
        process.execPath,
        [path.join(__dirname, "..", "bin", "marpx.js"), "--theme", args.name],
        repoRoot,
      );
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  buildDesignContent,
  createThemeFiles,
  fixtureTemplate,
  normalizeThemeName,
  parseArgs,
  themeCssTemplate,
};
