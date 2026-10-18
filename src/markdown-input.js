// A leading Unicode BOM is an encoding marker, not Markdown content.
function normalizeMarkdown(markdown) {
  return String(markdown || "").replace(/^\uFEFF/, "");
}

// Match closed front matter with Marp's dash delimiter lengths and whitespace. Offsets
// refer to the normalized input; callers retaining original source positions
// must keep the original source alongside it.
function frontmatterForMarkdown(markdown) {
  const source = normalizeMarkdown(markdown);
  const opening = /^(-{3,})[ \t]*(?:\r\n|\r|\n)/.exec(source);
  if (!opening) return null;
  const closing = new RegExp(`^ {0,3}-{${opening[1].length},}[ \\t]*$`);
  const lines = /([^\r\n]*)(\r\n|\r|\n|$)/g;
  lines.lastIndex = opening[0].length;
  let line;
  while ((line = lines.exec(source)) && line[0].length > 0) {
    if (closing.test(line[1])) {
      return {
        content: source
          .slice(opening[0].length, line.index)
          .replace(/(?:\r\n|\r|\n)$/, ""),
        end: line.index + line[1].length,
      };
    }
  }
  return null;
}

module.exports = { normalizeMarkdown, frontmatterForMarkdown };
