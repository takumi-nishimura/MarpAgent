const { buildSlideMapForFile, findSlideByDisplayedPage } = require("./slide-map");

/**
 * Resolve the page argument that `--screenshot`, serve, and `--overview`
 * accept: the displayed page number, or the rendered position when the deck
 * shows no page numbers (see findSlideByDisplayedPage in src/slide-map.js).
 * Returns { slideId, displayedPage, slide, renderedSlide } for the rendered
 * slide, where `slideId` is its `section` id, `slide` its Markdown slide index,
 * and `renderedSlide` its 1-based rendered position; or undefined when no
 * rendered slide matches. Hidden slides are never returned.
 */
function findSlideIdByDisplayedPage(deckPath, configPath, displayedPage) {
  const slideMap = buildSlideMapForFile(deckPath, { configPath });
  const entry = findSlideByDisplayedPage(slideMap, displayedPage);
  if (!entry) return undefined;
  return {
    slideId: entry.sectionId,
    displayedPage: entry.page,
    slide: entry.slide,
    renderedSlide: entry.renderedSlide,
  };
}

module.exports = {
  findSlideIdByDisplayedPage,
};
