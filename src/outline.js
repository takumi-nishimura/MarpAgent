const fs = require("node:fs");
const path = require("node:path");

function stripListMarker(line) {
  return line.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, "").trim();
}

function collectSectionBody(sections, name) {
  return (sections[name] || []).filter((line) => line.trim() !== "");
}

function parseBrief(markdown) {
  const sections = {};
  let currentSection = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim();
      sections[currentSection] = [];
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  const audience = collectSectionBody(sections, "Audience").map(
    stripListMarker,
  );
  const duration = collectSectionBody(sections, "Duration").map(
    stripListMarker,
  );
  const coreMessage = collectSectionBody(sections, "Core Message").map(
    stripListMarker,
  );
  const audienceAction = collectSectionBody(sections, "Audience Action").map(
    stripListMarker,
  );
  const requiredSections = collectSectionBody(sections, "Required Sections")
    .map(stripListMarker)
    .filter(Boolean);
  const mustUseAssets = collectSectionBody(sections, "Must-Use Assets")
    .map(stripListMarker)
    .filter(Boolean);
  const forbiddenPatterns = collectSectionBody(sections, "Forbidden Patterns")
    .map(stripListMarker)
    .filter(Boolean);
  const references = collectSectionBody(sections, "References")
    .map(stripListMarker)
    .filter(Boolean);

  return {
    audience,
    duration,
    coreMessage,
    audienceAction,
    requiredSections,
    mustUseAssets,
    forbiddenPatterns,
    references,
  };
}

function estimateOverflowRisk(title, context = "") {
  const score = title.length + context.length;
  if (score >= 90) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function suggestLayout(title) {
  const lowered = title.toLowerCase();
  if (/(compare|comparison|versus|vs\.?|trade-off|matrix)/.test(lowered)) {
    return "two-column";
  }
  if (/(process|workflow|flow|timeline|steps|state)/.test(lowered)) {
    return "content";
  }
  if (/(demo|case study|example|figure|chart|asset)/.test(lowered)) {
    return "two-column";
  }
  return "content";
}

function extractTargetSlideCount(durationLines, requiredSections) {
  const explicit = durationLines.find((line) =>
    /target slide count/i.test(line),
  );
  if (explicit) {
    const match = explicit.match(/(\d+)/);
    if (match) return Number(match[1]);
  }

  return Math.max(requiredSections.length + 2, 4);
}

function buildSlidePlan(brief) {
  const coreTakeaway =
    brief.coreMessage.find((line) => /one-sentence takeaway:/i.test(line)) ||
    brief.coreMessage[0] ||
    "Clarify the deck's core message.";
  const action =
    brief.audienceAction[0] ||
    "Summarize the decision or action expected from the audience.";

  const slides = [
    {
      title: "Opening promise",
      takeaway:
        coreTakeaway.replace(/^One-sentence takeaway:\s*/i, "").trim() ||
        coreTakeaway,
      layoutHint: "title slide",
      overflowRisk: "low",
    },
  ];

  if (brief.requiredSections.length >= 3) {
    slides.push({
      title: "Agenda",
      takeaway: "Frame the narrative before diving into detail.",
      layoutHint: "short agenda list",
      overflowRisk: brief.requiredSections.length > 5 ? "medium" : "low",
    });
  }

  for (const section of brief.requiredSections) {
    const assetContext = brief.mustUseAssets[0] || "";
    slides.push({
      title: section,
      takeaway: `Explain why "${section}" matters to the audience.`,
      layoutHint: suggestLayout(section),
      overflowRisk: estimateOverflowRisk(section, assetContext),
    });
  }

  return slides;
}

function buildOutlineMarkdown(brief, options = {}) {
  const sourcePath = options.sourcePath || "brief.md";
  const generatedDate =
    options.generatedDate || new Date().toISOString().split("T")[0];
  const targetSlideCount = extractTargetSlideCount(
    brief.duration,
    brief.requiredSections,
  );
  const slides = buildSlidePlan(brief);
  const audienceSummary =
    brief.audience.filter(Boolean).join(" / ") || "Not specified";
  const assetSummary =
    brief.mustUseAssets.filter(Boolean).join(" / ") || "None";
  const forbiddenSummary =
    brief.forbiddenPatterns.filter(Boolean).join(" / ") || "None";

  const lines = [
    "# Outline",
    "",
    `- Source brief: ${sourcePath}`,
    `- Generated: ${generatedDate}`,
    `- Target slide count: ${targetSlideCount}`,
    "",
    "## Deck Intent",
    "",
    `- Audience summary: ${audienceSummary}`,
    `- Core message: ${brief.coreMessage[0] || "Not specified"}`,
    `- Must-use assets: ${assetSummary}`,
    `- Forbidden patterns: ${forbiddenSummary}`,
    "",
    "## Slide Plan",
    "",
  ];

  slides.forEach((slide, index) => {
    lines.push(`### Slide ${index + 1}: ${slide.title}`);
    lines.push("");
    lines.push(`- Title: ${slide.title}`);
    lines.push(`- Takeaway: ${slide.takeaway}`);
    lines.push(`- Layout hint: ${slide.layoutHint}`);
    lines.push(`- Overflow risk: ${slide.overflowRisk}`);
    lines.push("");
  });

  if (brief.references.length > 0) {
    lines.push("## Source Notes");
    lines.push("");
    for (const reference of brief.references) {
      lines.push(`- ${reference}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function generateOutlineFile(briefPath, outputPath) {
  const markdown = fs.readFileSync(briefPath, "utf8");
  const brief = parseBrief(markdown);
  const outline = buildOutlineMarkdown(brief, {
    sourcePath: path.basename(briefPath),
  });
  fs.writeFileSync(outputPath, outline);
  return outline;
}

module.exports = {
  buildOutlineMarkdown,
  generateOutlineFile,
  parseBrief,
};
