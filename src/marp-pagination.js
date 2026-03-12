const fs = require("node:fs");
const path = require("node:path");

const { Marp } = require("@marp-team/marp-core");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`));
  return match ? match[1] : undefined;
}

function extractSlidePageMap(html) {
  const sections = html.match(/<section\b[^>]*>/g) || [];

  return sections
    .map((tag) => ({
      slideId: readAttribute(tag, "id"),
      displayedPage: readAttribute(tag, "data-marpit-pagination"),
    }))
    .filter((entry) => entry.slideId && entry.displayedPage)
    .map((entry) => ({
      slideId: entry.slideId,
      displayedPage: Number(entry.displayedPage),
    }));
}

function loadMarpConfig(configPath) {
  const resolvedConfigPath = path.resolve(configPath);
  delete require.cache[resolvedConfigPath];
  return require(resolvedConfigPath);
}

function renderDeckHtml(deckPath, configPath) {
  const markdown = fs.readFileSync(deckPath, "utf8");
  const config = loadMarpConfig(configPath);
  const marp = new Marp({ html: config.html ?? true });
  const configuredMarp =
    typeof config.engine === "function"
      ? config.engine({ marp }) || marp
      : marp;
  const { html } = configuredMarp.render(markdown);
  return html;
}

function findSlideIdByDisplayedPage(deckPath, configPath, displayedPage) {
  const html = renderDeckHtml(deckPath, configPath);
  const slidePageMap = extractSlidePageMap(html);
  return slidePageMap.find((entry) => entry.displayedPage === displayedPage);
}

module.exports = {
  extractSlidePageMap,
  findSlideIdByDisplayedPage,
};
