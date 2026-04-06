const path = require("node:path");

function parsePositiveInteger(value) {
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return parsed >= 1 ? parsed : undefined;
}

function parseDeckAndPageArgs(args, { repoRoot }) {
  if (args.length === 0) {
    throw new Error("Deck path is required.");
  }

  const firstAsPage = parsePositiveInteger(args[0]);
  if (firstAsPage !== undefined && args.length === 1) {
    throw new Error("Deck path is required before displayed page.");
  }

  const deckPath = path.resolve(repoRoot, args[0]);
  const displayedPage =
    args[1] === undefined ? undefined : parsePositiveInteger(args[1]);

  if (args[1] !== undefined && displayedPage === undefined) {
    throw new Error(`Invalid displayed page: ${args[1]}`);
  }

  if (args.length > 2) {
    throw new Error("Too many arguments.");
  }

  return { deckPath, displayedPage };
}

function buildDeckUrl(baseUrl, deckPath, slideId) {
  const route = encodeURIComponent(path.basename(deckPath));
  const hash = slideId ? `#${slideId}` : "";
  return `${baseUrl}/${route}${hash}`;
}

function buildOverviewUrl(baseUrl, slideId) {
  const url = new URL(baseUrl);

  if (slideId) {
    url.searchParams.set("slide", slideId);
  }

  return url.toString();
}

module.exports = {
  buildDeckUrl,
  buildOverviewUrl,
  parseDeckAndPageArgs,
  parsePositiveInteger,
};
