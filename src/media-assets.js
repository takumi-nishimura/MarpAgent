const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath } = require("node:url");
const { splitSlideRawBlocks } = require("./markdown-slides");

// Markdown image: `![alt](url)`, `![alt](<url with spaces>)`, optionally
// followed by a quoted or parenthesized title. Marp keywords such as `bg` or
// `w:300` live in the alt text and do not affect the URL.
const MARKDOWN_IMAGE_RE =
  /!\[[^\]]*\]\(\s*(?:<([^>\n]*)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
// HTML elements whose attributes load media into the slide.
const MEDIA_TAG_RE = /<(img|video|audio|source|object|embed)\b([^>]*)>/gi;
// Only these attributes load media; `data-src` and other `data-*` attributes
// must not match, hence the leading whitespace instead of a word boundary.
const MEDIA_ATTRIBUTE_RE =
  /(?:^|\s)(src|poster|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const CSS_URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi;
const STYLE_BLOCK_RE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const STYLE_ATTRIBUTE_RE = /(?:^|\s)style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const HTML_COMMENT_RE = /<!--([\s\S]*?)-->/g;
// Marp directives that carry CSS, such as `_backgroundImage: url(...)`.
const CSS_DIRECTIVE_RE = /(?:^|\n)\s*_?(?:backgroundImage|style)\s*:/;
// Any URL scheme (http:, https:, data:, blob:, mailto:, ...). Requiring two
// characters keeps Windows drive letters out.
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]+:/i;

/**
 * Blank out a match while keeping every character offset, so references found
 * in the remaining text still sort in source order.
 */
function blank(text) {
  return text.replace(/[^\n]/g, " ");
}

/**
 * Remove content that Marp does not render as media: fenced code, inline code,
 * and HTML comments other than CSS-bearing directives (speaker notes can quote
 * old image references).
 */
function maskNonRendered(raw) {
  const lines = raw.split("\n");
  let fence = null;
  const masked = lines.map((line) => {
    const fenceMatch = line.trim().match(/^(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) {
        fence = { char: marker[0], length: marker.length };
      } else if (marker[0] === fence.char && marker.length >= fence.length) {
        fence = null;
      }
      return blank(line);
    }
    return fence ? blank(line) : line;
  });

  return masked
    .join("\n")
    .replace(/(`+)(?:(?!\1).)+?\1/g, (match) => blank(match))
    .replace(HTML_COMMENT_RE, (match, body) =>
      CSS_DIRECTIVE_RE.test(body) ? match : blank(match),
    );
}

function collectCssUrls(css, offset, references) {
  for (const match of css.matchAll(CSS_URL_RE)) {
    const reference = match[1] ?? match[2] ?? match[3];
    references.push({ reference, index: offset + match.index });
  }
}

/**
 * Extract every media reference from a slide's raw Markdown, in source order:
 * Markdown images (including `![bg ...]` and size keywords), `src`, `poster`,
 * and `data` attributes of media elements, and CSS `url(...)` in `<style>`
 * blocks, `style` attributes, and directive comments.
 * Returns [{ reference, index }] with the reference exactly as written.
 */
function extractMediaReferences(raw) {
  const text = maskNonRendered(String(raw || ""));
  const references = [];

  for (const match of text.matchAll(MARKDOWN_IMAGE_RE)) {
    references.push({
      reference: match[1] ?? match[2],
      index: match.index,
    });
  }

  for (const tag of text.matchAll(MEDIA_TAG_RE)) {
    const attributesOffset = tag.index + 1 + tag[1].length;
    for (const attribute of tag[2].matchAll(MEDIA_ATTRIBUTE_RE)) {
      const name = attribute[1].toLowerCase();
      const tagName = tag[1].toLowerCase();
      if (name === "data" && tagName !== "object") continue;
      if (name === "poster" && tagName !== "video") continue;
      references.push({
        reference: attribute[2] ?? attribute[3] ?? attribute[4],
        index: attributesOffset + attribute.index,
      });
    }
  }

  for (const block of text.matchAll(STYLE_BLOCK_RE)) {
    collectCssUrls(block[1], block.index, references);
  }
  for (const attribute of text.matchAll(STYLE_ATTRIBUTE_RE)) {
    collectCssUrls(attribute[1] ?? attribute[2], attribute.index, references);
  }
  for (const comment of text.matchAll(HTML_COMMENT_RE)) {
    collectCssUrls(comment[1], comment.index, references);
  }

  return references
    .filter((item) => item.reference && item.reference.trim() !== "")
    .map((item) => ({ ...item, reference: item.reference.trim() }))
    .sort((a, b) => a.index - b.index);
}

/**
 * Resolve a media reference to a local file path, the way the browser resolves
 * it against the rendered deck. Returns null for references that are not
 * local files: remote `http(s)` and protocol-relative URLs (never fetched),
 * `data:` and other schemes, and bare fragments.
 */
function resolveLocalReference(reference, deckDir) {
  const value = String(reference || "").trim();
  if (!value || value.startsWith("#") || value.startsWith("//")) return null;

  if (URL_SCHEME_RE.test(value)) {
    if (!/^file:/i.test(value)) return null;
    try {
      return fileURLToPath(value.replace(/[?#].*$/, ""));
    } catch {
      return null;
    }
  }

  const withoutQuery = value.replace(/[?#].*$/, "");
  if (!withoutQuery) return null;
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    // Keep a malformed escape as written; the browser would too.
  }
  return path.isAbsolute(decoded)
    ? path.resolve(decoded)
    : path.resolve(deckDir, decoded);
}

function lstatOrNull(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch {
    return null;
  }
}

/**
 * Explain why a resolved path does not exist: a broken symlink at the path or
 * at one of its parent directories (reported with its target as written, and
 * with `link` naming the parent link when it is not the file itself), or
 * plainly not found. Returns null when the file exists.
 */
function diagnoseMissingPath(filePath, deckDir) {
  if (fs.existsSync(filePath)) return null;

  for (let current = filePath; ; current = path.dirname(current)) {
    const stats = lstatOrNull(current);
    if (stats?.isSymbolicLink() && !fs.existsSync(current)) {
      const diagnosis = {
        reason: "broken symlink",
        target: fs.readlinkSync(current),
      };
      if (current !== filePath) {
        const relative = path.relative(deckDir, current);
        diagnosis.link = relative.startsWith("..")
          ? current
          : relative.split(path.sep).join("/");
      }
      return diagnosis;
    }
    if (stats || path.dirname(current) === current) break;
  }
  return { reason: "not found" };
}

function isHiddenSlide(raw) {
  return /<!--\s*hide:\s*true\s*-->/.test(raw);
}

function extractFrontmatter(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return "";
  const closing = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  return closing === -1 ? "" : lines.slice(1, closing).join("\n");
}

/**
 * Source-level media check (ISS-0024): resolve every local media reference
 * relative to the deck file and report the ones that do not exist. It needs
 * no browser, so it also runs when rendering is unavailable. Remote URLs are
 * never fetched. CSS `url(...)` in the front matter applies to every slide
 * and is reported on the first rendered slide. Hidden slides are skipped
 * because they are not rendered.
 * Returns [{ slideNumber, missing: [{ reference, reason, path, link?,
 * target? }] }] for slides with at least one missing reference.
 */
function findMissingAssets(
  deckPath,
  markdown = fs.readFileSync(deckPath, "utf8"),
) {
  const deckDir = path.dirname(path.resolve(deckPath));
  const slides = splitSlideRawBlocks(markdown).filter(
    (slide) => slide.raw.trim() !== "" && !isHiddenSlide(slide.raw),
  );
  if (slides.length === 0) return [];

  const frontmatterReferences = [];
  collectCssUrls(extractFrontmatter(markdown), 0, frontmatterReferences);

  const results = [];
  slides.forEach((slide, position) => {
    const references = [
      ...(position === 0 ? frontmatterReferences : []),
      ...extractMediaReferences(slide.raw),
    ];
    const missing = [];
    const seen = new Set();
    for (const { reference } of references) {
      const filePath = resolveLocalReference(reference, deckDir);
      if (!filePath || seen.has(filePath)) continue;
      seen.add(filePath);
      const diagnosis = diagnoseMissingPath(filePath, deckDir);
      if (diagnosis) missing.push({ reference, path: filePath, ...diagnosis });
    }
    if (missing.length > 0) {
      results.push({ slideNumber: slide.number, missing });
    }
  });
  return results;
}

module.exports = {
  diagnoseMissingPath,
  extractMediaReferences,
  findMissingAssets,
  resolveLocalReference,
};
