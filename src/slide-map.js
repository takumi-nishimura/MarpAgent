const fs = require("node:fs");
const path = require("node:path");

const { Marp } = require("@marp-team/marp-core");

const DEFAULT_CONFIG_PATH = path.join(__dirname, "..", "marp.config.js");

function loadMarpConfig(configPath) {
  const resolvedConfigPath = path.resolve(configPath);
  delete require.cache[resolvedConfigPath];
  return require(resolvedConfigPath);
}

/**
 * Build a Marp instance the way Marp CLI does for `marp.config.js`: a Marp
 * Core instance handed to the config's `engine` factory, so every plugin the
 * config installs (hide, Mermaid, alerts, ...) takes part in parsing.
 */
function createConfiguredMarp(configPath = DEFAULT_CONFIG_PATH) {
  const config = loadMarpConfig(configPath);
  const marp = new Marp({ html: config.html ?? true });
  return typeof config.engine === "function"
    ? config.engine({ marp }) || marp
    : marp;
}

/**
 * Install two core rules that observe a parse without changing it.
 * Before `marpit_slide` they record where each slide starts in the source:
 * the first slide after the front matter, every other slide after the
 * level-0 `hr` that opens it, or at the heading itself when `headingDivider`
 * inserted a hidden `hr`. Before `marpit_directives_apply` they record every
 * `marpit_slide_open` token, so slides that a later rule removes (hidden
 * slides) are still known.
 */
function installSlideMapProbe(marp) {
  const probe = { sources: null, slideOpens: null };
  const md = marp.markdown;

  md.core.ruler.before(
    "marpit_slide",
    "marpagent_slide_map_sources",
    (state) => {
      if (state.inlineMode) return;
      const frontMatter = state.tokens.find(
        (token) => token.type === "front_matter",
      );
      const sources = [
        {
          separatorLine: null,
          startLine: frontMatter?.map ? frontMatter.map[1] : 0,
        },
      ];
      for (const token of state.tokens) {
        if (token.type !== "hr" || token.level !== 0) continue;
        const [first, last] = token.map || [0, 0];
        sources.push(
          token.hidden
            ? { separatorLine: first, startLine: first }
            : { separatorLine: first, startLine: last },
        );
      }
      probe.sources = sources;
    },
  );

  md.core.ruler.before(
    "marpit_directives_apply",
    "marpagent_slide_map_slides",
    (state) => {
      if (state.inlineMode) return;
      probe.slideOpens = state.tokens.filter(
        (token) => token.type === "marpit_slide_open",
      );
    },
  );

  return probe;
}

function toPage(value) {
  if (value === undefined || value === null || value === false) return null;
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : null;
}

/**
 * Compute the identity of every slide in a deck from the configured Marp
 * engine, the same engine and plugins Marp CLI renders with.
 *
 * Returns one entry per Marpit slide, in source order:
 * {
 *   slide,         // 1-based Markdown slide index (Marpit's slide order,
 *                  // counting hidden and empty slides)
 *   renderedSlide, // 1-based position among rendered slides, or null when
 *                  // the slide is hidden
 *   sectionId,     // `id` of the rendered <section>, or null when hidden
 *   page,          // displayed page number, or null when none is shown
 *   hidden,        // true when the hide plugin removed the slide
 *   line,          // 1-based first source line of the slide's content
 *   endLine,       // 1-based last source line of the slide's content
 *   raw,           // the slide's source text (lines line..endLine)
 * }
 *
 * `---` inside code fences, setext headings, empty slides, hidden slides,
 * and `headingDivider` all follow Marp because the map comes from its tokens.
 */
function buildSlideMap(markdown, options = {}) {
  const { configPath = DEFAULT_CONFIG_PATH } = options;
  const source = String(markdown || "");
  const marp = createConfiguredMarp(configPath);
  const probe = installSlideMapProbe(marp);
  const tokens = marp.markdown.parse(source, {});

  const renderedOpens = new Set(
    tokens.filter((token) => token.type === "marpit_slide_open"),
  );
  // markdown-it normalizes CRLF and CR to LF before computing token maps.
  const lines = source.split(/\r\n|\r|\n/);
  const sources = probe.sources || [{ separatorLine: null, startLine: 0 }];
  const slideOpens = probe.slideOpens || [];

  let renderedCount = 0;
  return slideOpens.map((token, index) => {
    const slideIndex = token.meta?.marpitSlide ?? index;
    const start = sources[slideIndex] || sources[sources.length - 1];
    const next = sources[slideIndex + 1];
    // A slide ends before the separator that opens the next slide.
    const endExclusive = next ? next.separatorLine : lines.length;
    const startLine = Math.min(start.startLine, endExclusive);
    const hidden = !renderedOpens.has(token);
    if (!hidden) renderedCount += 1;

    return {
      slide: slideIndex + 1,
      renderedSlide: hidden ? null : renderedCount,
      sectionId: hidden ? null : (token.attrGet("id") ?? null),
      page: hidden ? null : toPage(token.attrGet("data-marpit-pagination")),
      hidden,
      line: startLine + 1,
      endLine: Math.max(startLine + 1, endExclusive),
      raw: lines.slice(startLine, endExclusive).join("\n"),
    };
  });
}

function buildSlideMapForFile(deckPath, options = {}) {
  return buildSlideMap(fs.readFileSync(deckPath, "utf8"), options);
}

function renderedSlides(slideMap) {
  return slideMap.filter((entry) => !entry.hidden);
}

function findSlide(slideMap, slideNumber) {
  return slideMap.find((entry) => entry.slide === slideNumber);
}

/**
 * Resolve a page argument (`--screenshot`, serve, `--overview`) to a rendered
 * slide. The argument is the displayed page number, the number the slide shows
 * in its corner; with `paginate: hold` the first slide showing it wins. When
 * the deck shows no page numbers at all, the argument is the slide's position
 * among rendered slides instead. Hidden slides are never returned.
 */
function findSlideByDisplayedPage(slideMap, displayedPage) {
  const visible = renderedSlides(slideMap);
  const byPage = visible.find((entry) => entry.page === displayedPage);
  if (byPage) return byPage;
  if (visible.some((entry) => entry.page !== null)) return undefined;
  return visible.find((entry) => entry.renderedSlide === displayedPage);
}

/**
 * Human-readable slide label: the Markdown slide index, followed by the
 * displayed page when it differs (`slide 11 (page 10)`) or `(hidden)` when
 * the slide is not rendered. Accepts a slide map entry or a finding that
 * carries the identity fields.
 */
function formatSlideLabel(identity, noun = "slide") {
  const base = `${noun} ${identity.slide}`;
  if (identity.hidden || identity.renderedSlide === null) {
    return `${base} (hidden)`;
  }
  if (
    identity.page !== null &&
    identity.page !== undefined &&
    identity.page !== identity.slide
  ) {
    return `${base} (page ${identity.page})`;
  }
  return base;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  buildSlideMap,
  buildSlideMapForFile,
  createConfiguredMarp,
  findSlide,
  findSlideByDisplayedPage,
  formatSlideLabel,
  renderedSlides,
};
