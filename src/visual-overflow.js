const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { Marp } = require("@marp-team/marp-core");
const marpHideSlidesPlugin = require("../scripts/hide-slides-plugin");
const { splitSlideRawBlocks } = require("./markdown-slides");

// Visible content may cross an edge by this much before it counts as clipped,
// which absorbs sub-pixel rounding of line boxes and image edges.
const CLIP_TOLERANCE_PX = 2;
// Media may additionally lose this fraction of its size on one edge: a few
// pixels of an image or diagram margin are not a visible defect, while a few
// pixels of a text line are.
const MEDIA_CLIP_TOLERANCE_RATIO = 0.02;
// Unclipped content closer than this to the bottom, left, or right edge is
// reported as crowding (ADR-0001, ISS-0023). The value is in slide pixels at
// a 720px-tall canvas, matching the theme's pagination inset, and scales with
// canvas height.
const EDGE_SAFE_MARGIN_PX = 20;
const EDGE_REFERENCE_HEIGHT_PX = 720;

function emitDiagnostic(onDiagnostic, payload) {
  if (typeof onDiagnostic === "function") {
    onDiagnostic(payload);
  }
}

/**
 * Render deck markdown to self-contained HTML via Marp CLI.
 * Uses the bare template so every slide is laid out and visible at once; the
 * bespoke template hides inactive slides, which breaks element measurement
 * and element screenshots.
 * Returns the path to the generated HTML file (caller must clean up tempDir).
 */
function renderToHtml(deckPath) {
  const repoRoot = path.resolve(__dirname, "..");
  const marpBinary = path.join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "marp.cmd" : "marp",
  );
  const configPath = path.join(repoRoot, "marp.config.js");

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "marp-visual-overflow-"),
  );
  const tempDeckDir = path.join(tempRoot, "deck");
  const copiedDeckDir = path.join(
    tempDeckDir,
    path.basename(path.dirname(deckPath)),
  );
  const copiedDeckPath = path.join(copiedDeckDir, path.basename(deckPath));

  fs.mkdirSync(tempDeckDir, { recursive: true });
  fs.cpSync(path.dirname(deckPath), copiedDeckDir, { recursive: true });

  const outputName =
    path.basename(deckPath, path.extname(deckPath)) + ".html";
  const outputPath = path.join(copiedDeckDir, outputName);

  execFileSync(
    marpBinary,
    [
      "--html",
      "--template",
      "bare",
      "--allow-local-files",
      "--config-file",
      configPath,
      copiedDeckPath,
      "-o",
      outputPath,
    ],
    {
      cwd: copiedDeckDir,
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  return { htmlPath: outputPath, tempRoot };
}

/**
 * Browser-side audit: for every slide, find visible content that extends past
 * the slide canvas. Visible content is text line boxes and replaced elements,
 * each intersected with the clip rectangles of its overflow-clipping
 * ancestors inside the slide, so intentional crops and trailing margins do not
 * count. Runs inside the page via `page.evaluate`, so it must stay
 * self-contained.
 */
function auditSlidesInPage({
  tolerancePx,
  mediaToleranceRatio,
  safeMarginPx,
  referenceHeightPx,
}) {
  const REPLACED = "img,video,canvas,iframe,object,svg";

  function snippet(text) {
    const clean = text.replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
    return clean.length > 32 ? `${clean.slice(0, 31)}…` : clean;
  }

  function describe(element) {
    const tag = element.tagName.toLowerCase();
    const source = element.getAttribute("src") || element.getAttribute("data");
    if (source) return `<${tag} ${source}>`;
    const className = element.getAttribute("class");
    return className ? `<${tag} class="${className}">` : `<${tag}>`;
  }

  function clipByAncestors(rect, element, section) {
    let { left, top, right, bottom } = rect;
    for (let node = element.parentElement; node && node !== section; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      const clip = node.getBoundingClientRect();
      if (style.overflowX !== "visible") {
        left = Math.max(left, clip.left);
        right = Math.min(right, clip.right);
      }
      if (style.overflowY !== "visible") {
        top = Math.max(top, clip.top);
        bottom = Math.min(bottom, clip.bottom);
      }
      if (right <= left || bottom <= top) return null;
    }
    return { left, top, right, bottom };
  }

  // Absolutely positioned content, header/footer bands, and footnote blocks
  // (the theme's citation treatment, including in-flow variants such as
  // `.footnote-col`) sit at the edge on purpose, so they never count as
  // crowding.
  function isPlacedByLayout(element, section) {
    for (let node = element; node && node !== section; node = node.parentElement) {
      const tag = node.tagName.toLowerCase();
      if (tag === "header" || tag === "footer") return true;
      if ([...node.classList].some((name) => name.includes("footnote"))) return true;
      const { position } = getComputedStyle(node);
      if (position === "absolute" || position === "fixed") return true;
    }
    return false;
  }

  function isNestedSvgContent(node, section) {
    const svg = node.closest("svg");
    return Boolean(svg && section.contains(svg) && svg !== node);
  }

  return [...document.querySelectorAll("section[id]")].map((section, slideIndex) => {
    const canvas = section.getBoundingClientRect();
    const scale = canvas.width / section.offsetWidth || 1;
    const width = section.offsetWidth;
    const height = section.offsetHeight;
    const boxes = [];

    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || !snippet(node.textContent)) continue;
      if (isNestedSvgContent(parent, section)) continue;
      if (!parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width > 0 && rect.height > 0) {
          boxes.push({ rect, element: parent, media: false, label: `"${snippet(node.textContent)}"` });
        }
      }
    }

    for (const element of section.querySelectorAll(REPLACED)) {
      if (element.parentElement && isNestedSvgContent(element.parentElement, section)) continue;
      if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        boxes.push({ rect, element, media: true, label: describe(element) });
      }
    }

    const margin = safeMarginPx * (height / referenceHeightPx);
    const byLabel = new Map();
    const crowdedByLabel = new Map();
    for (const box of boxes) {
      const visible = clipByAncestors(box.rect, box.element, section);
      if (!visible) continue;
      const edges = {
        top: (canvas.top - visible.top) / scale,
        right: (visible.right - canvas.left) / scale - width,
        bottom: (visible.bottom - canvas.top) / scale - height,
        left: (canvas.left - visible.left) / scale,
      };
      const [edge, overflowPx] = Object.entries(edges).sort((a, b) => b[1] - a[1])[0];
      const extent = (edge === "top" || edge === "bottom" ? box.rect.height : box.rect.width) / scale;
      const allowed = box.media
        ? Math.max(tolerancePx, extent * mediaToleranceRatio)
        : tolerancePx;
      if (overflowPx <= allowed) {
        if (isPlacedByLayout(box.element, section)) continue;
        // Text is checked on three edges; media only at the bottom, because
        // media boxes often include transparent side margins.
        const checked = box.media ? ["bottom"] : ["bottom", "left", "right"];
        const [nearEdge, gap] = checked
          .map((name) => [name, -edges[name]])
          .sort((a, b) => a[1] - b[1])[0];
        if (gap >= margin) continue;
        const gapPx = Math.max(0, Math.round(gap));
        const nearest = crowdedByLabel.get(box.label);
        if (!nearest || nearest.gapPx > gapPx) {
          crowdedByLabel.set(box.label, { label: box.label, edge: nearEdge, gapPx });
        }
        continue;
      }
      const previous = byLabel.get(box.label);
      if (!previous || previous.overflowPx < overflowPx) {
        byLabel.set(box.label, { label: box.label, edge, overflowPx: Math.round(overflowPx) });
      }
    }

    const clipped = [...byLabel.values()].sort((a, b) => b.overflowPx - a.overflowPx);
    const crowded = [...crowdedByLabel.values()]
      .filter((item) => !byLabel.has(item.label))
      .sort((a, b) => a.gapPx - b.gapPx);
    return {
      slideIndex,
      width,
      height,
      clipped,
      maxOverflowPx: clipped.length > 0 ? clipped[0].overflowPx : 0,
      crowded,
      safeMarginPx: Math.round(margin),
    };
  });
}

/**
 * Launch Playwright Chromium and audit every rendered slide.
 * Returns one entry per rendered slide:
 * { slideIndex, width, height, clipped: [{ label, edge, overflowPx }],
 *   maxOverflowPx, crowded: [{ label, edge, gapPx }], safeMarginPx }.
 */
async function measureSlidesInBrowser(htmlPath, options = {}) {
  const {
    tolerancePx = CLIP_TOLERANCE_PX,
    mediaToleranceRatio = MEDIA_CLIP_TOLERANCE_RATIO,
    safeMarginPx = EDGE_SAFE_MARGIN_PX,
  } = options;
  let playwright;
  try {
    playwright = require("playwright");
  } catch (error) {
    const wrapped = new Error("Playwright is not installed.");
    wrapped.code = "PLAYWRIGHT_UNAVAILABLE";
    wrapped.cause = error;
    throw wrapped;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    return await page.evaluate(auditSlidesInPage, {
      tolerancePx,
      mediaToleranceRatio,
      safeMarginPx,
      referenceHeightPx: EDGE_REFERENCE_HEIGHT_PX,
    });
  } finally {
    await browser.close();
  }
}

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

/**
 * Build a mapping from rendered section index (0-based) to markdown slide number (1-based).
 * Hidden slides are skipped in the rendered output.
 */
function buildRenderedToMarkdownMap(markdown) {
  const rawSlides = splitSlideRawBlocks(markdown);
  const hidden = detectHiddenSlides(markdown);
  const map = [];

  for (const slide of rawSlides) {
    if (!hidden.has(slide.number) && slide.raw.trim() !== "") {
      map.push(slide.number);
    }
  }

  return map;
}

/**
 * Render a deck and audit every slide for clipped visible content.
 * Returns { status: "measured", slides: [{ slideNumber, clipped, maxOverflowPx,
 * crowded, safeMarginPx }] }
 * where slideNumber is the markdown slide number, or
 * { status: "skipped", reason, slides: [] } when rendering or the browser is
 * unavailable. In strict mode a failure throws instead of being skipped.
 */
async function measureRenderedSlides(deckPath, options = {}) {
  const { onDiagnostic, strictVisual = false } = options;
  let tempRoot;
  try {
    if (process.env.MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE === "1") {
      throw new Error("Forced visual check failure via MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE.");
    }

    const markdown = fs.readFileSync(deckPath, "utf8");
    const rendered = renderToHtml(deckPath);
    tempRoot = rendered.tempRoot;

    const audits = await measureSlidesInBrowser(rendered.htmlPath);
    const renderedToMarkdown = buildRenderedToMarkdownMap(markdown);

    return {
      status: "measured",
      slides: audits.map((audit) => ({
        slideNumber: renderedToMarkdown[audit.slideIndex] ?? audit.slideIndex + 1,
        clipped: audit.clipped,
        maxOverflowPx: audit.maxOverflowPx,
        crowded: audit.crowded,
        safeMarginPx: audit.safeMarginPx,
      })),
    };
  } catch (error) {
    emitDiagnostic(onDiagnostic, {
      component: "visual-check",
      level: "warning",
      event: "visual-check-failed",
      deckPath,
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
    });
    emitDiagnostic(onDiagnostic, {
      component: "visual-check",
      level: "warning",
      event: "heuristic-fallback",
      deckPath,
      reason: "visual-check-failed",
    });
    emitDiagnostic(onDiagnostic, {
      component: "visual-check",
      level: "debug",
      event: "visual-check-stack",
      deckPath,
      stack: error.stack,
    });
    if (strictVisual) {
      const strictError = new Error(
        `Visual check failed in strict mode for ${deckPath}: ${error.message}`,
      );
      strictError.code = "VISUAL_CHECK_FAILED";
      strictError.cause = error;
      throw strictError;
    }
    return { status: "skipped", reason: error.message, slides: [] };
  } finally {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

/**
 * Take a screenshot of a single slide by its section id attribute.
 * Returns a PNG Buffer.
 */
async function screenshotSlide(htmlPath, slideId) {
  const playwright = require("playwright");
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });

    const section = await page.$(`section[id="${slideId}"]`);
    if (!section) {
      throw new Error(
        `Slide section "${slideId}" not found in rendered HTML.`,
      );
    }

    return await section.screenshot();
  } finally {
    await browser.close();
  }
}

module.exports = {
  CLIP_TOLERANCE_PX,
  EDGE_SAFE_MARGIN_PX,
  MEDIA_CLIP_TOLERANCE_RATIO,
  auditSlidesInPage,
  buildRenderedToMarkdownMap,
  detectHiddenSlides,
  measureRenderedSlides,
  measureSlidesInBrowser,
  renderToHtml,
  screenshotSlide,
};
