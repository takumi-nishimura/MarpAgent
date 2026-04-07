const SUPPORTED_VERSION_PATTERN = /^0\.1\.\d+$/;

const REQUIRED_PATCH_MARKERS = [
  "function estimateTextWidth(",
  "return text.length * fontSize * widthRatio;",
  "return text.length * fontSize * 0.6;",
];

const CJK_EFFECTIVE_LENGTH_FN =
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
  "}\n";

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
  if (source.includes("function _effectiveLength(text)")) {
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
      CJK_EFFECTIVE_LENGTH_FN + "function estimateTextWidth(",
    )
    .replace(
      "return text.length * fontSize * widthRatio;",
      "return _effectiveLength(text) * fontSize * widthRatio;",
    )
    .replace(
      "return text.length * fontSize * 0.6;",
      "return _effectiveLength(text) * fontSize * 0.6;",
    );

  if (!patchedSource.includes("function _effectiveLength(text)")) {
    throw new Error("Patch canary failed: _effectiveLength insertion did not apply.");
  }
  if (
    !patchedSource.includes("return _effectiveLength(text) * fontSize * widthRatio;") ||
    !patchedSource.includes("return _effectiveLength(text) * fontSize * 0.6;")
  ) {
    throw new Error("Patch canary failed: text width substitutions did not apply.");
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
