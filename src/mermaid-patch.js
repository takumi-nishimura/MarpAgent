const SUPPORTED_VERSION_PATTERN = /^0\.1\.\d+$/;

const REQUIRED_PATCH_MARKERS = [
  "function estimateTextWidth(",
  "return text.length * fontSize * widthRatio;",
  "return text.length * fontSize * 0.6;",
  "function estimateNodeSize(id, label, shape) {",
  "  const textWidth = estimateTextWidth(label, FONT_SIZES.nodeLabel, FONT_WEIGHTS.nodeLabel);\n" +
    "  let width = textWidth + NODE_PADDING.horizontal * 2;\n" +
    "  let height = FONT_SIZES.nodeLabel + NODE_PADDING.vertical * 2;",
  '  return `<text x="${cx}" y="${cy}" text-anchor="middle" dy="${TEXT_BASELINE_SHIFT}" font-size="${FONT_SIZES.nodeLabel}" font-weight="${FONT_WEIGHTS.nodeLabel}" fill="${textColor}">${escapeXml(node.label)}</text>`;',
];

const MARP_AGENT_MERMAID_HELPERS =
  "function _effectiveLength(text) {\n" +
  "  let len = 0\n" +
  "  for (const ch of text) {\n" +
  "    const cp = ch.codePointAt(0)\n" +
  "    if ((cp >= 0x2E80 && cp <= 0x9FFF) || (cp >= 0xF900 && cp <= 0xFAFF) ||\n" +
  "        (cp >= 0xFE30 && cp <= 0xFFEF) || (cp >= 0x20000 && cp <= 0x2FA1F))\n" +
  "      len += 1.8\n" +
  "    else\n" +
  "      len += 1\n" +
  "  }\n" +
  "  return len\n" +
  "}\n" +
  "function _stripMermaidQuoteWrapper(text) {\n" +
  '  if (text.startsWith("\\"") && text.endsWith("\\"")) {\n' +
  "    return text.slice(1, -1)\n" +
  "  }\n" +
  '  if (text.startsWith("&quot;") && text.endsWith("&quot;")) {\n' +
  "    return text.slice(6, -6)\n" +
  "  }\n" +
  "  return text\n" +
  "}\n" +
  "function _splitExplicitLabelLines(label) {\n" +
  "  const text = _stripMermaidQuoteWrapper(String(label))\n" +
  "  const lines = text.split(/<br\\s*\\/?\\s*>|&lt;br\\s*\\/?\\s*&gt;|\\\\n|\\n/i)\n" +
  "  if (lines.length <= 1) return null\n" +
  "  return lines\n" +
  "}\n" +
  "function _measureExplicitLabelSize(label, fontSize, fontWeight) {\n" +
  "  const lines = _splitExplicitLabelLines(label)\n" +
  "  if (!lines) {\n" +
  "    return { width: estimateTextWidth(label, fontSize, fontWeight), height: fontSize }\n" +
  "  }\n" +
  "  const width = Math.max(...lines.map((line) => estimateTextWidth(line, fontSize, fontWeight)))\n" +
  "  const lineHeight = fontSize * 1.2\n" +
  "  return { width, height: fontSize + (lines.length - 1) * lineHeight }\n" +
  "}\n" +
  "function _formatPxAsEm(px, fontSize) {\n" +
  "  const em = px / fontSize\n" +
  '  if (Math.abs(em) < 0.0001) return "0em"\n' +
  "  return `${Number(em.toFixed(3))}em`\n" +
  "}\n";

const NODE_SIZE_MARKER =
  "  const textWidth = estimateTextWidth(label, FONT_SIZES.nodeLabel, FONT_WEIGHTS.nodeLabel);\n" +
  "  let width = textWidth + NODE_PADDING.horizontal * 2;\n" +
  "  let height = FONT_SIZES.nodeLabel + NODE_PADDING.vertical * 2;";

const NODE_SIZE_REPLACEMENT =
  "  const labelSize = _measureExplicitLabelSize(label, FONT_SIZES.nodeLabel, FONT_WEIGHTS.nodeLabel);\n" +
  "  let width = labelSize.width + NODE_PADDING.horizontal * 2;\n" +
  "  let height = labelSize.height + NODE_PADDING.vertical * 2;";

const RENDER_NODE_LABEL_RETURN_MARKER =
  '  return `<text x="${cx}" y="${cy}" text-anchor="middle" dy="${TEXT_BASELINE_SHIFT}" font-size="${FONT_SIZES.nodeLabel}" font-weight="${FONT_WEIGHTS.nodeLabel}" fill="${textColor}">${escapeXml(node.label)}</text>`;';

const RENDER_NODE_LABEL_REPLACEMENT =
  "  const explicitLabelLines = _splitExplicitLabelLines(node.label);\n" +
  "  if (explicitLabelLines) {\n" +
  "    const fontSize = FONT_SIZES.nodeLabel;\n" +
  "    const dyPx = parseFloat(TEXT_BASELINE_SHIFT) * fontSize;\n" +
  "    const lineHeightPx = fontSize * 1.2;\n" +
  "    const firstDy = _formatPxAsEm(\n" +
  "      dyPx - ((explicitLabelLines.length - 1) * lineHeightPx) / 2,\n" +
  "      fontSize,\n" +
  "    );\n" +
  "    const tspans = explicitLabelLines\n" +
  "      .map((line, index) => {\n" +
  '        const dy = index === 0 ? firstDy : "1.2em";\n' +
  '        return `<tspan x="${cx}" dy="${dy}">${escapeXml(line)}</tspan>`;\n' +
  "      })\n" +
  '      .join("");\n' +
  '    return `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="${FONT_SIZES.nodeLabel}" font-weight="${FONT_WEIGHTS.nodeLabel}" fill="${textColor}">${tspans}</text>`;\n' +
  "  }\n" +
  RENDER_NODE_LABEL_RETURN_MARKER;

function assertSupportedBeautifulMermaidVersion(version) {
  if (SUPPORTED_VERSION_PATTERN.test(version)) return;
  throw new Error(
    `Unsupported beautiful-mermaid version ${version}. Expected ${SUPPORTED_VERSION_PATTERN}.`,
  );
}

function assertPatchMarkersPresent(source) {
  for (const marker of REQUIRED_PATCH_MARKERS) {
    if (!source.includes(marker)) {
      throw new Error(`Patch canary failed: missing marker "${marker}"`);
    }
  }
}

function applyBeautifulMermaidPatch(source) {
  if (
    source.includes("function _effectiveLength(text)") &&
    source.includes("function _splitExplicitLabelLines(label)")
  ) {
    return {
      source,
      patched: false,
      reason: "already-patched",
    };
  }

  assertPatchMarkersPresent(source);

  const patchedSource = source
    .replace(
      "function estimateTextWidth(",
      MARP_AGENT_MERMAID_HELPERS + "function estimateTextWidth(",
    )
    .replace(
      "return text.length * fontSize * widthRatio;",
      "return _effectiveLength(text) * fontSize * widthRatio;",
    )
    .replace(
      "return text.length * fontSize * 0.6;",
      "return _effectiveLength(text) * fontSize * 0.6;",
    )
    .replace(NODE_SIZE_MARKER, NODE_SIZE_REPLACEMENT)
    .replace(RENDER_NODE_LABEL_RETURN_MARKER, RENDER_NODE_LABEL_REPLACEMENT);

  if (!patchedSource.includes("function _effectiveLength(text)")) {
    throw new Error(
      "Patch canary failed: _effectiveLength insertion did not apply.",
    );
  }
  if (!patchedSource.includes("function _splitExplicitLabelLines(label)")) {
    throw new Error(
      "Patch canary failed: explicit label line helper insertion did not apply.",
    );
  }
  if (
    !patchedSource.includes(
      "return _effectiveLength(text) * fontSize * widthRatio;",
    ) ||
    !patchedSource.includes("return _effectiveLength(text) * fontSize * 0.6;")
  ) {
    throw new Error(
      "Patch canary failed: text width substitutions did not apply.",
    );
  }
  if (
    !patchedSource.includes(
      "const labelSize = _measureExplicitLabelSize(label, FONT_SIZES.nodeLabel, FONT_WEIGHTS.nodeLabel);",
    )
  ) {
    throw new Error(
      "Patch canary failed: node size substitution did not apply.",
    );
  }
  if (
    !patchedSource.includes(
      "const explicitLabelLines = _splitExplicitLabelLines(node.label);",
    )
  ) {
    throw new Error(
      "Patch canary failed: node label renderer substitution did not apply.",
    );
  }

  return {
    source: patchedSource,
    patched: true,
    reason: "patched",
  };
}

module.exports = {
  applyBeautifulMermaidPatch,
  assertSupportedBeautifulMermaidVersion,
  assertPatchMarkersPresent,
  SUPPORTED_VERSION_PATTERN,
};
