const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { splitNonEmptySlides } = require("./markdown-slides");

function splitSlides(markdown) {
  return splitNonEmptySlides(markdown);
}

function stripNonContent(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<div\s+class="footnote[^"]*"[\s\S]*?<\/div>\s*(?=<\/div>|$)/gi, "");
}

function isHtmlOnlyLine(line) {
  return /^<\/?[a-z][^>]*>$/i.test(line);
}

function getVisibleLines(raw) {
  const lines = [];
  let inCodeFence = false;

  for (const originalLine of stripNonContent(raw).split(/\r?\n/)) {
    const line = originalLine.trim();
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    if (!line) continue;
    if (isHtmlOnlyLine(line)) continue;
    lines.push(line);
  }

  return lines;
}

function getHeading(lines) {
  const heading = lines.find((line) => /^#{1,6}\s+/.test(line));
  return heading ? heading.replace(/^#{1,6}\s+/, "").trim() : null;
}

function countBullets(lines) {
  return lines.filter((line) => /^(?:[-*+]\s+|\d+\.\s+)/.test(line)).length;
}

function countTopLevelBullets(raw) {
  let count = 0;
  for (const line of stripNonContent(raw).split(/\r?\n/)) {
    if (/^(?:[-*+]\s+|\d+\.\s+)/.test(line)) count++;
  }
  return count;
}

function countTinyTypography(raw) {
  const classMatches = raw.match(/\btext-xs(?:2|3)?\b/g) || [];
  const inlineMatches =
    raw.match(/font-size\s*:\s*(?:0\.[0-7]\d*|[1-9]\d?px)/gi) || [];
  const smallTags = raw.match(/<small>/g) || [];
  return classMatches.length + inlineMatches.length + smallTags.length;
}

function detectTableMetrics(lines) {
  const tableLines = lines.filter((line) => /^\|.*\|$/.test(line));
  if (tableLines.length < 2) {
    return { columns: 0, rows: 0 };
  }

  const columns = tableLines[0]
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean).length;
  const rows = Math.max(tableLines.length - 2, 0);
  return { columns, rows };
}

function buildFinding(slide, ruleId, severity, title, suggestion) {
  return {
    slide: slide.number,
    ruleId,
    severity,
    title,
    suggestion,
  };
}

function lintSlide(slide) {
  const lines = getVisibleLines(slide.raw);
  const findings = [];
  const heading = getHeading(lines);
  const bulletCount = countBullets(lines);
  const topLevelBulletCount = countTopLevelBullets(slide.raw);
  const textLines = lines.filter(
    (line) =>
      !/^(?:[-*+]\s+|\d+\.\s+|<[^>]+>|\|.*\|$)/.test(line) &&
      !/^#{1,6}\s+/.test(line),
  );
  const figureCount = (
    slide.raw.match(/!\[[^\]]*\]\([^)]+\)|<img\b|<figure\b|<video\b/gi) || []
  ).length;
  const tableMetrics = detectTableMetrics(lines);
  const strippedRaw = stripNonContent(slide.raw);
  const tinyTypographyCount = countTinyTypography(strippedRaw);
  const contentLines = lines.filter((line) => !/^\|.*\|$/.test(line));
  const totalChars = contentLines.join(" ").length;

  if (heading && heading.length > 48) {
    findings.push(
      buildFinding(
        slide,
        "long-heading",
        "warning",
        `Heading is ${heading.length} characters long.`,
        "Shorten the slide title and move the detail into body content or a follow-up slide.",
      ),
    );
  }

  if (topLevelBulletCount >= 9) {
    findings.push(
      buildFinding(
        slide,
        "dense-bullets",
        "warning",
        `Slide contains ${topLevelBulletCount} top-level bullet items.`,
        "Split the list into multiple slides or group the bullets into a smaller number of takeaways.",
      ),
    );
  }

  if (figureCount > 0 && (topLevelBulletCount >= 6 || textLines.length >= 6)) {
    findings.push(
      buildFinding(
        slide,
        "figure-text-density",
        "warning",
        "Slide combines a visual with dense supporting text.",
        "Let the figure carry more of the explanation and move extra text to speaker notes or another slide.",
      ),
    );
  }

  if (
    (tableMetrics.columns >= 5 && tableMetrics.rows >= 3) ||
    (slide.raw.includes('class="col"') && topLevelBulletCount >= 10)
  ) {
    findings.push(
      buildFinding(
        slide,
        "comparison-overpacked",
        "warning",
        "Comparison content is likely too dense for one slide.",
        "Reduce the comparison dimensions or split the comparison into focused slides.",
      ),
    );
  }

  if (tinyTypographyCount > 0) {
    findings.push(
      buildFinding(
        slide,
        "typography-drift",
        "warning",
        "Slide relies on tiny text styling.",
        "Prefer splitting content across slides instead of shrinking the typography further.",
      ),
    );
  }

  const hasVeryLongBodyLine = textLines.some((line) => line.length >= 140);

  if (
    topLevelBulletCount >= 12 ||
    textLines.length >= 10 ||
    totalChars >= 600 ||
    (heading && heading.length >= 70) ||
    hasVeryLongBodyLine
  ) {
    findings.push(
      buildFinding(
        slide,
        "overflow-risk",
        "warning",
        "Slide has a high overflow risk by heuristic.",
        "Shorten the slide, trim copy, or spread the material across more slides before adjusting font size.",
      ),
    );
  }

  return {
    slide: slide.number,
    heading,
    findings,
  };
}

function validateDeckMarkdown(markdown) {
  const slides = splitSlides(markdown);
  const results = slides.map(lintSlide);
  const findings = results.flatMap((result) => result.findings);
  return {
    slideCount: slides.length,
    slides: results,
    findings,
  };
}

function formatSummary(deckPath, result) {
  const relativeDeckPath = deckPath
    ? path.relative(process.cwd(), deckPath)
    : "stdin";
  const lines = [
    `Deck: ${relativeDeckPath}`,
    `Slides: ${result.slideCount}`,
    `Findings: ${result.findings.length}`,
  ];

  if (result.findings.length > 0) {
    lines.push("");
    for (const finding of result.findings) {
      lines.push(
        `[${finding.severity}] slide ${finding.slide} ${finding.ruleId}: ${finding.title} ${finding.suggestion}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function defaultImageExporter({ deckPath, reportDir, slideNumbers }) {
  if (slideNumbers.length === 0) return [];

  const repoRoot = path.resolve(__dirname, "..");
  const marpBinary = path.join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "marp.cmd" : "marp",
  );
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "marp-agent-validator-"),
  );
  const tempDeckDir = path.join(tempRoot, "deck");
  const screenshotsDir = path.join(reportDir, "screenshots");
  const copiedDeckDir = path.join(
    tempDeckDir,
    path.basename(path.dirname(deckPath)),
  );
  const copiedDeckPath = path.join(copiedDeckDir, path.basename(deckPath));

  ensureDir(tempDeckDir);
  fs.cpSync(path.dirname(deckPath), copiedDeckDir, { recursive: true });

  execFileSync(
    marpBinary,
    [
      "--images",
      "png",
      "--allow-local-files",
      "--config-file",
      path.join(repoRoot, "marp.config.js"),
      copiedDeckPath,
    ],
    {
      cwd: copiedDeckDir,
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  ensureDir(screenshotsDir);
  const sourcePrefix = path.basename(deckPath, path.extname(deckPath));
  const artifacts = [];
  for (const slideNumber of slideNumbers) {
    const sourceImage = path.join(
      copiedDeckDir,
      `${sourcePrefix}.${String(slideNumber).padStart(3, "0")}.png`,
    );
    const destination = path.join(
      screenshotsDir,
      `slide-${String(slideNumber).padStart(3, "0")}.png`,
    );
    if (fs.existsSync(sourceImage)) {
      fs.copyFileSync(sourceImage, destination);
      artifacts.push(destination);
    }
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
  return artifacts;
}

function writeArtifacts(result, options = {}) {
  const { deckPath, reportDir, imageExporter = defaultImageExporter } = options;
  if (!reportDir) return { reportFiles: [], screenshotFiles: [] };

  ensureDir(reportDir);
  const summaryPath = path.join(reportDir, "report.md");
  const jsonPath = path.join(reportDir, "report.json");
  const slideNumbers = [
    ...new Set(result.findings.map((finding) => finding.slide)),
  ];

  const screenshotFiles = imageExporter({ deckPath, reportDir, slideNumbers });
  const report = {
    deckPath,
    slideCount: result.slideCount,
    findings: result.findings,
    screenshots: screenshotFiles.map((filePath) =>
      path.relative(reportDir, filePath),
    ),
  };

  const markdownLines = [
    "# Deck Validation Report",
    "",
    `- Deck: ${deckPath}`,
    `- Slides: ${result.slideCount}`,
    `- Findings: ${result.findings.length}`,
    "",
    "## Findings",
    "",
  ];

  if (result.findings.length === 0) {
    markdownLines.push("No findings.");
  } else {
    for (const finding of result.findings) {
      markdownLines.push(
        `- Slide ${finding.slide} \`${finding.ruleId}\`: ${finding.title} ${finding.suggestion}`,
      );
    }
  }

  if (screenshotFiles.length > 0) {
    markdownLines.push("");
    markdownLines.push("## Screenshots");
    markdownLines.push("");
    for (const screenshot of screenshotFiles) {
      markdownLines.push(`- ${path.relative(reportDir, screenshot)}`);
    }
  }

  markdownLines.push("");

  fs.writeFileSync(summaryPath, `${markdownLines.join("\n").trimEnd()}\n`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  return {
    reportFiles: [summaryPath, jsonPath],
    screenshotFiles,
  };
}

function validateDeckFile(deckPath, options = {}) {
  const markdown = fs.readFileSync(deckPath, "utf8");
  const result = validateDeckMarkdown(markdown);
  const artifacts = writeArtifacts(result, {
    deckPath,
    reportDir: options.reportDir,
    imageExporter: options.imageExporter,
  });

  return {
    ...result,
    artifacts,
  };
}

/**
 * Validate a deck with both heuristic rules and pixel-accurate visual overflow detection.
 * Falls back to heuristic-only if Playwright is unavailable.
 */
async function validateDeckWithVisualCheck(deckPath, options = {}) {
  const { measureVisualOverflow: defaultMeasureVisualOverflow } = require("./visual-overflow");
  const measureVisualOverflow =
    options.measureVisualOverflow || defaultMeasureVisualOverflow;

  const markdown = fs.readFileSync(deckPath, "utf8");
  const result = validateDeckMarkdown(markdown);

  const overflows = await measureVisualOverflow(deckPath, {
    onDiagnostic: options.onDiagnostic,
  });

  const visualSlides = new Set(overflows.map((o) => o.slideNumber));

  // Remove heuristic overflow-risk findings for slides where visual measurement ran
  if (overflows.length > 0) {
    result.findings = result.findings.filter(
      (f) => !(f.ruleId === "overflow-risk" && visualSlides.has(f.slide)),
    );
  }

  // Add visual-overflow findings
  for (const overflow of overflows) {
    result.findings.push(
      buildFinding(
        { number: overflow.slideNumber },
        "visual-overflow",
        "warning",
        `Slide content overflows by ${overflow.overflowPx}px (${overflow.scrollHeight}px content in ${overflow.clientHeight}px viewport).`,
        "Reduce content, split into multiple slides, or adjust layout to fit within the slide area.",
      ),
    );
  }

  // Sort findings by slide number for consistent output
  result.findings.sort((a, b) => a.slide - b.slide);

  const artifacts = writeArtifacts(result, {
    deckPath,
    reportDir: options.reportDir,
    imageExporter: options.imageExporter,
  });

  return {
    ...result,
    artifacts,
  };
}

module.exports = {
  defaultImageExporter,
  formatSummary,
  splitSlides,
  validateDeckFile,
  validateDeckMarkdown,
  validateDeckWithVisualCheck,
  writeArtifacts,
};
