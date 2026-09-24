const { buildSlideMap } = require("./slide-map");

/**
 * Detect hidden slides from markdown source.
 * The deck is parsed by the configured Marp engine (see src/slide-map.js), so
 * `hide: true` and `_hide: true` are recognized exactly as they are rendered.
 * Returns a Set of 1-based Markdown slide indices that are hidden.
 */
function detectHiddenSlides(markdown, options = {}) {
  const slideMap = options.slideMap || buildSlideMap(markdown, options);
  return new Set(
    slideMap.filter((entry) => entry.hidden).map((entry) => entry.slide),
  );
}

module.exports = {
  detectHiddenSlides,
};
