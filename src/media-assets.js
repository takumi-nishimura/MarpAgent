const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath } = require("node:url");
const { decodeHTMLAttribute } = require("entities");
const { HTML_PART_RE, parseSource, sourceLines } = require("./markdown-source");
const { buildSlideMap } = require("./slide-map");

// Consume every attribute so strings inside quoted values cannot become
// attributes themselves (for example title="src='example.png'").
const HTML_ATTRIBUTE_RE =
  /\s+([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const CSS_URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi;
// Marp directives that carry CSS, such as `_backgroundImage: url(...)`.
const CSS_DIRECTIVE_RE = /(?:^|\n)\s*_?(?:backgroundImage|style)\s*:/;
// Any URL scheme (http:, https:, data:, blob:, mailto:, ...). Requiring two
// characters keeps Windows drive letters out.
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]+:/i;

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
 * Returns [{ reference, index }] with escapes and character references decoded.
 */
function extractMediaReferences(raw) {
  const references = [];
  for (const fragment of parseSource(raw)) {
    if (fragment.type === "image") {
      references.push({ reference: fragment.reference, index: fragment.index });
      continue;
    }
    for (const part of fragment.content.matchAll(HTML_PART_RE)) {
      const text = part[0];
      const index = fragment.position(part.index);
      if (index === null) continue;
      if (text.startsWith("<!--")) {
        const body = text.slice(4, -3);
        if (CSS_DIRECTIVE_RE.test(body))
          collectCssUrls(body, index, references);
        continue;
      }
      if (part[1]) {
        if (part[1].toLowerCase() === "style") {
          collectCssUrls(
            text.replace(/^<style\b[^>]*>|<\/style\s*>$/gi, ""),
            index,
            references,
          );
        }
        continue;
      }
      const tagName = text.match(/^<([a-z]+)/i)?.[1].toLowerCase();
      for (const attribute of text.matchAll(HTML_ATTRIBUTE_RE)) {
        const name = attribute[1].toLowerCase();
        const reference = decodeHTMLAttribute(
          attribute[2] ?? attribute[3] ?? attribute[4],
        );
        if (name === "style") {
          collectCssUrls(reference, index + attribute.index, references);
        } else if (
          ["img", "video", "audio", "source", "object", "embed"].includes(
            tagName,
          )
        ) {
          if (!["src", "poster", "data"].includes(name)) continue;
          if (name === "data" && tagName !== "object") continue;
          if (name === "poster" && tagName !== "video") continue;
          references.push({
            reference,
            index: index + attribute.index,
          });
        }
      }
    }
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

// Export artifacts a render never loads: PDF exports, typically the largest
// file in a deck directory, and the hidden `.*.overview.html` pages the
// preview server writes next to the deck. Everything else is copied, because
// any other file might back a media reference.
function isRenderArtifact(fileName) {
  return (
    fileName.toLowerCase().endsWith(".pdf") ||
    (fileName.startsWith(".") && fileName.endsWith(".overview.html"))
  );
}

/**
 * Copy the deck's directory into `destinationDir` for a render. Export
 * artifacts (PDFs, generated `.*.overview.html`) are skipped unless the deck
 * references them — a PDF embedded via <embed>/<object> still has to load.
 * `fs.cp` resolves symlink targets to absolute paths, so links such as
 * `shared -> ../../assets` keep working inside the temp copy.
 */
function copyDeckForRender(deckPath, destinationDir) {
  const deckDir = path.dirname(path.resolve(deckPath));
  const markdown = fs.readFileSync(deckPath, "utf8");
  const references = extractMediaReferences(markdown);
  collectCssUrls(extractFrontmatter(markdown), 0, references);
  const referenced = new Set(
    references
      .map(({ reference }) => resolveLocalReference(reference, deckDir))
      .filter(Boolean),
  );

  fs.cpSync(deckDir, destinationDir, {
    recursive: true,
    filter: (source) =>
      !isRenderArtifact(path.basename(source)) ||
      referenced.has(path.resolve(source)),
  });
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
 * Slides are numbered by their Markdown slide index (src/slide-map.js); pass
 * `options.slideMap` to reuse a map the caller already built.
 * Returns [{ slideNumber, missing: [{ reference, reason, path, link?,
 * target? }] }] for slides with at least one missing reference.
 */
function findMissingAssets(
  deckPath,
  markdown = fs.readFileSync(deckPath, "utf8"),
  options = {},
) {
  const deckDir = path.dirname(path.resolve(deckPath));
  const slideMap = options.slideMap || buildSlideMap(markdown);
  const slides = slideMap
    .filter((entry) => !entry.hidden && entry.raw.trim() !== "")
    .map((entry) => ({
      number: entry.slide,
      line: entry.line,
      endLine: entry.endLine,
    }));
  if (slides.length === 0) return [];

  const frontmatterReferences = [];
  collectCssUrls(extractFrontmatter(markdown), 0, frontmatterReferences);

  const referencesBySource = extractMediaReferences(markdown);
  const lines = sourceLines(markdown);
  const results = [];
  slides.forEach((slide, position) => {
    const references = [
      ...(position === 0 ? frontmatterReferences : []),
      ...referencesBySource.filter(
        ({ index }) =>
          index >= (lines[slide.line - 1]?.offset ?? 0) &&
          index < (lines[slide.endLine]?.offset ?? markdown.length),
      ),
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
  copyDeckForRender,
  diagnoseMissingPath,
  extractMediaReferences,
  findMissingAssets,
  resolveLocalReference,
};
