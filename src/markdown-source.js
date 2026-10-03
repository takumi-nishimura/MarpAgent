const MarkdownIt = require("markdown-it");
const htmlInline =
  require("markdown-it/lib/rules_inline/html_inline.mjs").default;
const image = require("markdown-it/lib/rules_inline/image.mjs").default;

// Keep source locations while using the same Markdown grammar as Marp.
// Parsing alone never runs renderers, loads media, or invokes Mermaid.
const parser = new MarkdownIt({ html: true });
parser.normalizeLink = (value) => value;
for (const [name, rule] of [
  ["html_inline", htmlInline],
  ["image", image],
]) {
  parser.inline.ruler.at(name, (state, silent) => {
    const start = state.pos;
    const count = state.tokens.length;
    if (!rule(state, silent)) return false;
    if (!silent) {
      const token = state.tokens
        .slice(count)
        .findLast((item) => item.type === name);
      if (token) token.meta = { sourceRange: [start, state.pos] };
    }
    return true;
  });
}

function sourceLines(source) {
  let offset = 0;
  return source.split(/(?<=\n)/).map((raw) => {
    const line = { text: raw.replace(/\r?\n$/, ""), offset };
    offset += raw.length;
    return line;
  });
}

// Block quotes and lists remove prefixes, and Markdown normalizes CRLF.
// Map each content line back to the original bytes rather than serializing
// the document, which would otherwise rewrite unrelated source.
function contentMapper(token, lines) {
  let lineIndex = token.map[0];
  let contentOffset = 0;
  const spans = [];
  for (const text of token.content.split("\n")) {
    let column = -1;
    while (lineIndex < token.map[1] && lineIndex < lines.length) {
      column = lines[lineIndex].text.indexOf(text);
      if (column !== -1) break;
      lineIndex++;
    }
    if (column === -1) break;
    spans.push({
      start: contentOffset,
      end: contentOffset + text.length,
      source: lines[lineIndex].offset + column,
    });
    contentOffset += text.length + 1;
    lineIndex++;
  }
  return (offset) => {
    const span = spans.find(
      (item) => offset >= item.start && offset <= item.end,
    );
    return span ? span.source + offset - span.start : null;
  };
}

function parseSource(source) {
  source = String(source || "");
  const lines = sourceLines(source);
  // Front matter is not Markdown content. Retain line numbers and offsets.
  const input = source.replace(
    /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/,
    (value) => value.replace(/[^\r\n]/g, " "),
  );
  const tokens = parser.parse(input, {});
  const fragments = [];
  for (const token of tokens) {
    if (!token.map) continue;
    const position = contentMapper(token, lines);
    if (token.type === "html_block") {
      fragments.push({ type: "html", content: token.content, position });
    } else if (token.type === "inline") {
      for (const child of token.children || []) {
        if (!child.meta?.sourceRange) continue;
        const [start] = child.meta.sourceRange;
        if (child.type === "html_inline") {
          fragments.push({
            type: "html",
            content: child.content,
            position: (offset) => position(start + offset),
          });
        } else if (child.type === "image") {
          fragments.push({
            type: "image",
            reference: child.attrGet("src"),
            index: position(start),
          });
        }
      }
    }
  }
  return fragments;
}

// Respect quoted '>' characters and skip comments and raw-text elements.
// The latter may contain example tags that are not elements in the DOM.
const HTML_PART_RE =
  /<!--[\s\S]*?-->|<(script|style|textarea)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<\/?[a-z][\w:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

module.exports = { HTML_PART_RE, parseSource, sourceLines };
