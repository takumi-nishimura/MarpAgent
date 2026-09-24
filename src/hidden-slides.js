const { Marp } = require("@marp-team/marp-core");
const marpHideSlidesPlugin = require("../scripts/hide-slides-plugin");
const { splitSlideRawBlocks } = require("./markdown-slides");

/**
 * Detect hidden slides from markdown source.
 * Each slide block is parsed by Marp with the same hide plugin the renderer
 * uses, so `hide: true` and `_hide: true` are recognized exactly as they are
 * rendered: a block is hidden when the plugin removes all of its slides.
 * Returns a Set of 1-based slide numbers that are hidden.
 */
function detectHiddenSlides(markdown) {
  const hidden = new Set();
  const rawSlides = splitSlideRawBlocks(markdown);
  const marp = new Marp({ html: true }).use(marpHideSlidesPlugin);

  for (const slide of rawSlides) {
    const tokens = marp.markdown.parse(slide.raw, {});
    if (!tokens.some((token) => token.type === "marpit_slide_open")) {
      hidden.add(slide.number);
    }
  }
  return hidden;
}

module.exports = {
  detectHiddenSlides,
};
