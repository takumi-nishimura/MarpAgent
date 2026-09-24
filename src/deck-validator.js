const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { isASeriesCanvas } = require("./canvas-size");
const { copyDeckForRender, findMissingAssets } = require("./media-assets");
const { splitNonEmptySlides } = require("./markdown-slides");

function splitSlides(markdown) {
  return splitNonEmptySlides(markdown);
}

/**
 * A-series paper decks are single dense canvases, not slide sequences, so the
 * per-slide density heuristics do not apply. Detect them from front matter
 * size directives such as `a4-portrait` or `a4-landscape`.
 */
function isPaperDeck(markdown) {
  return isASeriesCanvas(markdown);
}

function stripNonContent(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(
      /<div\s+class="footnote[^"]*"[\s\S]*?<\/div>\s*(?=<\/div>|$)/gi,
      "",
    );
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

function detectTinyTypography(raw) {
  const classMatches = raw.match(/\btext-xs(?:2|3)\b/g) || [];
  const inlineMatches =
    raw.match(/font-size\s*:\s*(?:0\.[0-7]\d*|[1-9]\d?px)/gi) || [];
  const smallTags = raw.match(/<small>/g) || [];
  const triggers = [];
  for (const className of classMatches) triggers.push(`.${className}`);
  if (inlineMatches.length > 0) triggers.push("inline font-size");
  if (smallTags.length > 0) triggers.push("<small>");
  return {
    count: classMatches.length + inlineMatches.length + smallTags.length,
    triggers,
  };
}

/**
 * Walk a `<div class="col">` container and return the raw markup of each
 * immediate child column div, so each column's bullet budget can be reported
 * separately when `dense-bullets` fires across a multi-column layout.
 */
function findColumnContents(raw) {
  const colOpen = raw.match(/<div\s+class="col(?:\s[^"]*)?"[^>]*>/);
  if (!colOpen) return null;

  const tagRe = /<\/?div\b[^>]*>/g;
  tagRe.lastIndex = colOpen.index + colOpen[0].length;

  let depth = 1;
  let childStart = -1;
  const columns = [];

  let match;
  while ((match = tagRe.exec(raw)) !== null) {
    const isClose = match[0].startsWith("</");
    if (isClose) {
      depth -= 1;
      if (depth === 0) break;
      if (depth === 1 && childStart !== -1) {
        columns.push(raw.slice(childStart, match.index));
        childStart = -1;
      }
    } else {
      if (depth === 1 && childStart === -1) {
        childStart = tagRe.lastIndex;
      }
      depth += 1;
    }
  }

  return columns.length >= 2 ? columns : null;
}

/**
 * Check whether a body line that tripped the single-line cap came from a
 * callout block, so the message can name the source instead of leaving the
 * author to guess.
 */
function isLineFromCallout(line, raw) {
  const lines = raw.split(/\r?\n/);
  const target = line.trim();
  const idx = lines.findIndex((l) => {
    const stripped = l.replace(/^>\s*/, "").trim();
    return l.trim() === target || stripped === target;
  });
  if (idx === -1) return false;

  if (/^\s*>/.test(lines[idx])) return true;

  for (let i = idx - 1; i >= 0; i -= 1) {
    if (/<\/div>/i.test(lines[i])) return false;
    if (
      /<div\s+class="(?:note|tip|important|warning|caution)"/i.test(lines[i])
    ) {
      return true;
    }
  }
  return false;
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

// Severity model (ADR-0001):
// - "error": a visible defect measured on the rendered slide, or a media file
//   the deck references that is definitely missing; fails the run.
// - "warning": a design risk measured on the render (edge crowding), or a
//   source heuristic reported while rendering was unavailable.
// - "info": a source heuristic reported alongside a successful render; a
//   non-blocking hint that is hidden from the text summary by default.
const HEURISTIC_SEVERITY = { fallback: "warning", measured: "info" };

function buildFinding(
  slide,
  ruleId,
  severity,
  title,
  suggestion,
  source = "heuristic",
) {
  return {
    slide: slide.number,
    ruleId,
    severity,
    source,
    title,
    suggestion,
  };
}

function countFindings(findings) {
  const counts = { errors: 0, warnings: 0, hints: 0 };
  for (const finding of findings) {
    if (finding.severity === "error") counts.errors += 1;
    else if (finding.severity === "warning") counts.warnings += 1;
    else counts.hints += 1;
  }
  return counts;
}

/**
 * Exit code for a validation result: 1 only when a visible defect was
 * measured. Heuristic warnings and hints never fail the run on their own.
 */
function exitCodeFor(result) {
  return result.findings.some((finding) => finding.severity === "error")
    ? 1
    : 0;
}

function describeVisualCheck(visualCheck) {
  if (!visualCheck) return "not run";
  if (visualCheck.status === "measured") return "measured";
  return `skipped (${visualCheck.reason || "unknown reason"})`;
}

function lintSlide(slide, options = {}) {
  const severity = options.severity || HEURISTIC_SEVERITY.fallback;
  const lines = getVisibleLines(slide.raw);
  const heading = getHeading(lines);

  // A-series paper outputs are intentionally dense single-page canvases; the
  // slide-density heuristics below are meaningless for them. Visual overflow
  // is still measured separately in validateDeckWithVisualCheck.
  if (options.paper) {
    return { slide: slide.number, heading, findings: [] };
  }

  const findings = [];
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
  const tinyTypography = detectTinyTypography(strippedRaw);
  const contentLines = lines.filter((line) => !/^\|.*\|$/.test(line));
  const totalChars = contentLines.join(" ").length;

  if (heading && heading.length > 48) {
    findings.push(
      buildFinding(
        slide,
        "long-heading",
        severity,
        `Heading is ${heading.length} characters long.`,
        "Shorten the slide title and move the detail into body content or a follow-up slide.",
      ),
    );
  }

  if (topLevelBulletCount >= 9) {
    const columnContents = findColumnContents(slide.raw);
    let denseBulletsTitle = `Slide contains ${topLevelBulletCount} top-level bullet items.`;
    if (columnContents) {
      const perColumn = columnContents.map((column) =>
        countTopLevelBullets(column),
      );
      const totalAcrossColumns = perColumn.reduce((sum, n) => sum + n, 0);
      if (totalAcrossColumns >= topLevelBulletCount * 0.8) {
        denseBulletsTitle = `Slide contains ${topLevelBulletCount} top-level bullets (${perColumn.join("+")} across ${perColumn.length} columns).`;
      }
    }
    findings.push(
      buildFinding(
        slide,
        "dense-bullets",
        severity,
        denseBulletsTitle,
        "Split the list into multiple slides or group the bullets into a smaller number of takeaways.",
      ),
    );
  }

  if (figureCount > 0 && (topLevelBulletCount >= 6 || textLines.length >= 6)) {
    const densityDetail =
      topLevelBulletCount >= 6
        ? `${topLevelBulletCount} bullets`
        : `${textLines.length} text lines`;
    findings.push(
      buildFinding(
        slide,
        "figure-text-density",
        severity,
        `Slide combines a visual with ${densityDetail} of supporting text.`,
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
        severity,
        "Comparison content is likely too dense for one slide.",
        "Reduce the comparison dimensions or split the comparison into focused slides.",
      ),
    );
  }

  if (tinyTypography.count > 0) {
    const triggerLabel =
      tinyTypography.triggers.length > 0
        ? tinyTypography.triggers.join(", ")
        : "tiny text";
    findings.push(
      buildFinding(
        slide,
        "typography-drift",
        severity,
        `Slide uses tiny text styling: ${triggerLabel}.`,
        "Prefer splitting content across slides instead of shrinking the typography further.",
      ),
    );
  }

  const longBodyLine = textLines.find((line) => line.length >= 140);

  if (
    topLevelBulletCount >= 12 ||
    textLines.length >= 10 ||
    totalChars >= 600 ||
    (heading && heading.length >= 70) ||
    longBodyLine
  ) {
    const reasons = [];
    if (topLevelBulletCount >= 12)
      reasons.push(`${topLevelBulletCount} bullets`);
    if (textLines.length >= 10) reasons.push(`${textLines.length} text lines`);
    if (totalChars >= 600) reasons.push(`${totalChars} body chars`);
    if (heading && heading.length >= 70)
      reasons.push(`${heading.length}-char heading`);
    if (longBodyLine) {
      const fromCallout = isLineFromCallout(longBodyLine, slide.raw);
      reasons.push(
        `single line ${longBodyLine.length} chars${fromCallout ? " (callout body)" : ""}`,
      );
    }
    findings.push(
      buildFinding(
        slide,
        "overflow-risk",
        severity,
        `Slide has a high overflow risk: ${reasons.join("; ")}.`,
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

function validateDeckMarkdown(markdown, options = {}) {
  const slides = splitSlides(markdown);
  const paper = isPaperDeck(markdown);
  const results = slides.map((slide) =>
    lintSlide(slide, { paper, severity: options.heuristicSeverity }),
  );
  const findings = results.flatMap((result) => result.findings);
  return {
    slideCount: slides.length,
    paper,
    slides: results,
    findings,
  };
}

function formatFindingLine(finding) {
  const label = finding.severity === "info" ? "hint" : finding.severity;
  return `[${label}] slide ${finding.slide} ${finding.ruleId}: ${finding.title} ${finding.suggestion}`;
}

function formatSummary(deckPath, result, options = {}) {
  const { showHints = false } = options;
  const relativeDeckPath = deckPath
    ? path.relative(process.cwd(), deckPath)
    : "stdin";
  const counts = countFindings(result.findings);
  const lines = [
    `Deck: ${relativeDeckPath}`,
    `Slides: ${result.slideCount}`,
    `Visual check: ${describeVisualCheck(result.visualCheck)}`,
    `Findings: ${counts.errors + counts.warnings} (errors: ${counts.errors}, warnings: ${counts.warnings})`,
  ];
  if (counts.hints > 0) {
    lines.push(`Hints: ${counts.hints}`);
  }

  const shown = result.findings.filter(
    (finding) => showHints || finding.severity !== "info",
  );
  if (shown.length > 0) {
    lines.push("");
    for (const finding of shown) lines.push(formatFindingLine(finding));
  }

  if (!showHints && counts.hints > 0) {
    lines.push("");
    lines.push(
      `${counts.hints} source-heuristic hint(s) hidden; hints never fail validation. Re-run with --hints to list them.`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function toSarifLevel(severity) {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "note";
}

function buildSarifReport(deckPath, result) {
  const artifactUri = deckPath
    ? path.relative(process.cwd(), deckPath)
    : "stdin";
  const rules = new Map();

  for (const finding of result.findings) {
    if (!rules.has(finding.ruleId)) {
      rules.set(finding.ruleId, {
        id: finding.ruleId,
        name: finding.ruleId,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.suggestion },
      });
    }
  }

  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "marpx-validator",
            rules: [...rules.values()],
          },
        },
        properties: {
          visualCheck: result.visualCheck || { status: "not-run" },
        },
        results: result.findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: toSarifLevel(finding.severity),
          message: {
            text: `Slide ${finding.slide}: ${finding.title} ${finding.suggestion}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: artifactUri },
                region: { startLine: 1 },
              },
              logicalLocations: [
                {
                  name: `Slide ${finding.slide}`,
                  fullyQualifiedName: `slide.${finding.slide}`,
                },
              ],
            },
          ],
          properties: {
            slide: finding.slide,
            severity: finding.severity,
            source: finding.source,
            suggestion: finding.suggestion,
          },
        })),
      },
    ],
  };
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
  try {
    copyDeckForRender(deckPath, copiedDeckDir);

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

    return artifacts;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function writeArtifacts(result, options = {}) {
  const { deckPath, reportDir, imageExporter = defaultImageExporter } = options;
  if (!reportDir) return { reportFiles: [], screenshotFiles: [] };

  ensureDir(reportDir);
  const summaryPath = path.join(reportDir, "report.md");
  const jsonPath = path.join(reportDir, "report.json");
  const slideNumbers = [
    ...new Set(
      result.findings
        .filter((finding) => finding.severity !== "info")
        .map((finding) => finding.slide),
    ),
  ];

  const screenshotFiles = imageExporter({
    deckPath,
    reportDir,
    slideNumbers,
  });
  const counts = countFindings(result.findings);
  const report = {
    deckPath,
    slideCount: result.slideCount,
    visualCheck: result.visualCheck || { status: "not-run" },
    counts,
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
    `- Visual check: ${describeVisualCheck(result.visualCheck)}`,
    `- Findings: ${counts.errors + counts.warnings} (errors: ${counts.errors}, warnings: ${counts.warnings})`,
    `- Hints: ${counts.hints}`,
    "",
    "## Findings",
    "",
  ];

  const blocking = result.findings.filter(
    (finding) => finding.severity !== "info",
  );
  const hints = result.findings.filter(
    (finding) => finding.severity === "info",
  );
  if (blocking.length === 0) {
    markdownLines.push("No findings.");
  } else {
    for (const finding of blocking) {
      markdownLines.push(
        `- Slide ${finding.slide} \`${finding.ruleId}\` (${finding.severity}): ${finding.title} ${finding.suggestion}`,
      );
    }
  }

  if (hints.length > 0) {
    markdownLines.push("");
    markdownLines.push("## Hints");
    markdownLines.push("");
    markdownLines.push(
      "Source heuristics that did not correspond to a measured defect. Judge them against the rendered slides.",
    );
    markdownLines.push("");
    for (const finding of hints) {
      markdownLines.push(
        `- Slide ${finding.slide} \`${finding.ruleId}\`: ${finding.title}`,
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

function describeMissingAsset(item) {
  if (item.reason !== "broken symlink") {
    return `${item.reference} (${item.reason})`;
  }
  const link = item.link ? ` ${item.link}` : "";
  return `${item.reference} (broken symlink${link} -> ${item.target})`;
}

/**
 * Merge the source-level file check with rendered media failures into one
 * `missing-asset` error per slide (ISS-0024). A reference the file check
 * already reports is not repeated from the render. The finding's source is
 * "render" only when every item came from the render (for example an image
 * that exists but cannot be decoded); otherwise it is "files".
 */
function buildMissingAssetFindings(fileResults, renderedSlides = []) {
  const bySlide = new Map();
  const itemsFor = (slideNumber) => {
    if (!bySlide.has(slideNumber)) bySlide.set(slideNumber, []);
    return bySlide.get(slideNumber);
  };

  for (const { slideNumber, missing } of fileResults) {
    for (const item of missing) {
      itemsFor(slideNumber).push({ ...item, source: "files" });
    }
  }
  for (const slideAudit of renderedSlides) {
    for (const item of slideAudit.missingMedia || []) {
      const items = itemsFor(slideAudit.slideNumber);
      const duplicate = items.some(
        (existing) =>
          (existing.path && item.path && existing.path === item.path) ||
          existing.reference === item.reference,
      );
      if (!duplicate) items.push({ ...item, source: "render" });
    }
  }

  const findings = [];
  for (const [slideNumber, items] of bySlide) {
    if (items.length === 0) continue;
    const source = items.every((item) => item.source === "render")
      ? "render"
      : "files";
    findings.push(
      buildFinding(
        { number: slideNumber },
        "missing-asset",
        "error",
        `Media referenced by the slide did not load: ${items.map(describeMissingAsset).join(", ")}.`,
        "Restore the file or fix the reference; repoint a broken symlink at an existing file inside the repository.",
        source,
      ),
    );
  }
  return findings;
}

/**
 * Heuristic-only validation, used when rendering is unavailable. Findings are
 * warnings and the result records why the visual check did not run.
 */
function validateDeckFile(deckPath, options = {}) {
  const markdown = fs.readFileSync(deckPath, "utf8");
  const result = {
    ...validateDeckMarkdown(markdown, {
      heuristicSeverity: HEURISTIC_SEVERITY.fallback,
    }),
    visualCheck: options.visualCheck || {
      status: "skipped",
      reason: "visual check was not attempted",
    },
  };
  // The file check needs no browser, so missing media still fail the run.
  result.findings.push(
    ...buildMissingAssetFindings(findMissingAssets(deckPath, markdown)),
  );
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

function formatClippedTitle(slideAudit) {
  const parts = slideAudit.clipped
    .slice(0, 3)
    .map((item) => `${item.label} (${item.edge} ${item.overflowPx}px)`);
  const more =
    slideAudit.clipped.length > 3
      ? ` and ${slideAudit.clipped.length - 3} more`
      : "";
  return `Visible content extends past the slide edge by up to ${slideAudit.maxOverflowPx}px: ${parts.join(", ")}${more}.`;
}

function formatCrowdedTitle(slideAudit) {
  const parts = slideAudit.crowded
    .slice(0, 3)
    .map((item) => `${item.label} (${item.edge} ${item.gapPx}px)`);
  const more =
    slideAudit.crowded.length > 3
      ? ` and ${slideAudit.crowded.length - 3} more`
      : "";
  return `Content sits within the ${slideAudit.safeMarginPx}px safe margin of the slide edge: ${parts.join(", ")}${more}.`;
}

function formatSmallTextTitle(slideAudit) {
  const kind = (item) => (item.secondary ? "secondary" : "body");
  const parts = slideAudit.smallText
    .slice(0, 3)
    .map((item) => `${item.label} (${item.fontPx}px ${kind(item)})`);
  const more =
    slideAudit.smallText.length > 3
      ? ` and ${slideAudit.smallText.length - 3} more`
      : "";
  const floors = slideAudit.textFloorPx
    ? ` (${slideAudit.textFloorPx.body}px body, ${slideAudit.textFloorPx.secondary}px secondary)`
    : "";
  return `Text renders below the readable size floor${floors}: ${parts.join(", ")}${more}.`;
}

// Source heuristics that a successful render answers directly, so they are
// dropped instead of reported as hints: the clipping check replaces
// `overflow-risk` and the rendered font size check replaces `typography-drift`
// (ISS-0022).
const SUPERSEDED_BY_RENDER = new Set(["overflow-risk", "typography-drift"]);

/**
 * Validate a deck by rendering it and measuring visible defects (ADR-0001).
 * When the render succeeds, measured defects are errors and source heuristics
 * become hints; `overflow-risk` and `typography-drift` are dropped because the
 * measurement answers them directly. When rendering is unavailable,
 * heuristics are reported as warnings and `visualCheck.status` is "skipped".
 */
async function validateDeckWithVisualCheck(deckPath, options = {}) {
  const {
    measureRenderedSlides: defaultMeasureRenderedSlides,
  } = require("./visual-overflow");
  const measureRenderedSlides =
    options.measureRenderedSlides || defaultMeasureRenderedSlides;

  const markdown = fs.readFileSync(deckPath, "utf8");
  const measurement = await measureRenderedSlides(deckPath, {
    onDiagnostic: options.onDiagnostic,
    strictVisual: options.strictVisual,
  });
  const measured = measurement.status === "measured";

  const result = validateDeckMarkdown(markdown, {
    heuristicSeverity: measured
      ? HEURISTIC_SEVERITY.measured
      : HEURISTIC_SEVERITY.fallback,
  });
  result.visualCheck = measured
    ? { status: "measured" }
    : { status: "skipped", reason: measurement.reason };

  if (measured) {
    result.findings = result.findings.filter(
      (finding) => !SUPERSEDED_BY_RENDER.has(finding.ruleId),
    );
    for (const slideAudit of measurement.slides) {
      if (slideAudit.clipped.length === 0) continue;
      result.findings.push(
        buildFinding(
          { number: slideAudit.slideNumber },
          "content-clipped",
          "error",
          formatClippedTitle(slideAudit),
          "Resize or move the listed elements, trim the slide, or split it so everything fits inside the canvas.",
          "render",
        ),
      );
    }
    for (const slideAudit of measurement.slides) {
      if (!slideAudit.crowded || slideAudit.crowded.length === 0) continue;
      result.findings.push(
        buildFinding(
          { number: slideAudit.slideNumber },
          "edge-crowding",
          "warning",
          formatCrowdedTitle(slideAudit),
          "Leave breathing room at the edge: trim or rebalance the content, or move the element inward.",
          "render",
        ),
      );
    }
    for (const slideAudit of measurement.slides) {
      if (!slideAudit.smallText || slideAudit.smallText.length === 0) continue;
      result.findings.push(
        buildFinding(
          { number: slideAudit.slideNumber },
          "text-too-small",
          "error",
          formatSmallTextTitle(slideAudit),
          "Raise the listed text to at least the floor by removing the font-size override, transform, or tiny utility class; if the slide then overflows, split it or move detail to speaker notes instead of shrinking other text.",
          "render",
        ),
      );
    }
  }

  // The file check runs whether or not the render succeeded; rendered media
  // failures add what it cannot see, such as files that fail to decode.
  result.findings.push(
    ...buildMissingAssetFindings(
      findMissingAssets(deckPath, markdown),
      measured ? measurement.slides : [],
    ),
  );

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
  HEURISTIC_SEVERITY,
  countFindings,
  defaultImageExporter,
  buildSarifReport,
  exitCodeFor,
  formatSummary,
  isPaperDeck,
  splitSlides,
  validateDeckFile,
  validateDeckMarkdown,
  validateDeckWithVisualCheck,
  writeArtifacts,
};
