const CUSTOM_PIXEL_SIZE_RE = /^([1-9]\d{0,4})x([1-9]\d{0,4})$/;
const A_SERIES_SIZE_RE = /^a4-(?:portrait|landscape)$/i;

function getFrontmatterBlock(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return "";
  let closingIndex = 1;
  while (closingIndex < lines.length && lines[closingIndex].trim() !== "---") {
    closingIndex += 1;
  }
  if (closingIndex >= lines.length) return "";
  return lines.slice(1, closingIndex).join("\n");
}

function readFrontmatterValue(markdown, key) {
  const fm = getFrontmatterBlock(markdown);
  if (!fm) return "";
  const pattern = new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, "im");
  const match = fm.match(pattern);
  if (!match) return "";
  return match[1].replace(/^['"]|['"]$/g, "").trim();
}

function getCanvasSize(markdown) {
  return readFrontmatterValue(markdown, "size");
}

function isASeriesCanvas(markdownOrSize) {
  const size = String(markdownOrSize || "").includes("\n")
    ? getCanvasSize(markdownOrSize)
    : String(markdownOrSize || "");
  return A_SERIES_SIZE_RE.test(size);
}

function parseCustomPixelSize(size) {
  const match = String(size || "").trim().match(CUSTOM_PIXEL_SIZE_RE);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width > 10000 || height > 10000) return null;

  return {
    name: `${width}x${height}`,
    width,
    height,
  };
}

function findCustomPixelSizes(markdown) {
  const customSize = parseCustomPixelSize(getCanvasSize(markdown));
  return customSize ? [customSize] : [];
}

function injectCustomSizeMetadata(css, sizes) {
  if (sizes.length === 0) return css;

  let nextCss = css;
  const lines = [];
  for (const size of sizes) {
    const line = ` * @size ${size.name} ${size.width}px ${size.height}px`;
    if (!nextCss.includes(line)) lines.push(line);
  }
  if (lines.length === 0) return nextCss;

  return nextCss.replace(
    /(\/\*![\s\S]*?@theme\s+\S+[^\n]*\n)/,
    `$1${lines.join("\n")}\n`,
  );
}

function ensureCustomSizesForMarkdown(marp, markdown) {
  const sizes = findCustomPixelSizes(markdown);
  if (sizes.length === 0) return false;

  const themeName = readFrontmatterValue(markdown, "theme") || "lab";
  if (!marp.themeSet?.has(themeName)) return false;

  const theme = marp.themeSet.get(themeName);
  const css = injectCustomSizeMetadata(theme.css, sizes);
  if (css === theme.css) return true;

  marp.themeSet.add(css);
  return true;
}

module.exports = {
  getCanvasSize,
  getFrontmatterBlock,
  ensureCustomSizesForMarkdown,
  findCustomPixelSizes,
  injectCustomSizeMetadata,
  isASeriesCanvas,
  parseCustomPixelSize,
  readFrontmatterValue,
};
