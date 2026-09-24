const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { Marp } = require("@marp-team/marp-core");
const marpHideSlidesPlugin = require("../scripts/hide-slides-plugin");
const { splitSlideRawBlocks } = require("./markdown-slides");
const { copyDeckForRender, diagnoseMissingPath } = require("./media-assets");

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
// Visible text whose rendered size is below these floors is reported as too
// small to read (ADR-0001, ISS-0022). The values are in slide pixels on the
// 1280x720 reference canvas. Body text must reach 12px (1/60 of the height);
// secondary text (footnotes, citation markers, captions, header/footer) must
// reach 8px. Other canvases scale the floors by the factor that fits the
// reference canvas inside them, min(width / 1280, height / 720): a 16:9 slide
// scales with its height, and an A4 page with its width, as if a slide were
// printed across the page.
const BODY_TEXT_FLOOR_PX = 12;
const SECONDARY_TEXT_FLOOR_PX = 8;
const TEXT_REFERENCE_WIDTH_PX = 1280;
// Images and video/audio get this long to finish loading or fail before the
// page is measured. Media still pending afterwards are not reported, because
// they are not definitely broken (ISS-0024).
const MEDIA_SETTLE_TIMEOUT_MS = 15000;

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
  copyDeckForRender(deckPath, copiedDeckDir);

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
 * count. It also records the rendered font size of each visible text run and
 * lists the runs below the readable floor. Runs inside the page via
 * `page.evaluate`, so it must stay self-contained.
 */
function auditSlidesInPage({
  tolerancePx,
  mediaToleranceRatio,
  safeMarginPx,
  referenceHeightPx,
  bodyFloorPx,
  secondaryFloorPx,
  referenceWidthPx,
}) {
  const REPLACED = "img,video,canvas,iframe,object,svg";
  // Footnotes, citation markers, captions, and header/footer bands are
  // secondary text, held to the lower floor. `mtight` marks KaTeX sub- and
  // superscripts, and `rt` ruby annotations.
  const SECONDARY_TAGS = new Set(["header", "footer", "figcaption", "caption", "sup", "sub", "rt"]);

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

  function isSecondaryText(element, section) {
    for (let node = element; node && node !== section; node = node.parentElement) {
      if (SECONDARY_TAGS.has(node.tagName.toLowerCase())) return true;
      if ([...node.classList].some((name) => /footnote|caption/.test(name) || name === "mtight")) {
        return true;
      }
    }
    return false;
  }

  // Vertical scale that transforms, the `scale` property, and `zoom` apply to
  // an element relative to its slide. The computed font size excludes them.
  function scaleWithinSection(element, section) {
    let factor = 1;
    for (let node = element; node && node !== section; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.transform && style.transform !== "none") {
        const matrix = new DOMMatrixReadOnly(style.transform);
        factor *= Math.hypot(matrix.c, matrix.d);
      }
      if (style.scale && style.scale !== "none") {
        const values = style.scale.split(/\s+/).map(Number.parseFloat);
        factor *= values.length > 1 ? values[1] : values[0];
      }
      const zoom = Number.parseFloat(style.zoom);
      if (zoom > 0) factor *= zoom;
    }
    return factor;
  }

  function roundTenth(value) {
    return Math.round(value * 10) / 10;
  }

  return [...document.querySelectorAll("section[id]")].map((section, slideIndex) => {
    const canvas = section.getBoundingClientRect();
    const scale = canvas.width / section.offsetWidth || 1;
    const width = section.offsetWidth;
    const height = section.offsetHeight;
    const boxes = [];
    const textRuns = [];

    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || !snippet(node.textContent)) continue;
      if (isNestedSvgContent(parent, section)) continue;
      if (!parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const label = `"${snippet(node.textContent)}"`;
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
      for (const rect of rects) {
        boxes.push({ rect, element: parent, media: false, label });
      }
      // Only text that shows more than a pixel after clipping has a readable
      // size; this skips visually hidden copies such as KaTeX's MathML.
      const shown = rects.some((rect) => {
        const visible = clipByAncestors(rect, parent, section);
        return visible && visible.right - visible.left > scale && visible.bottom - visible.top > scale;
      });
      if (!shown) continue;
      const fontSize = Number.parseFloat(getComputedStyle(parent).fontSize);
      textRuns.push({
        label,
        fontPx: roundTenth(fontSize * scaleWithinSection(parent, section)),
        secondary: isSecondaryText(parent, section),
      });
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

    const fontScale = Math.min(width / referenceWidthPx, height / referenceHeightPx);
    const textFloorPx = {
      body: roundTenth(bodyFloorPx * fontScale),
      secondary: roundTenth(secondaryFloorPx * fontScale),
    };
    const smallByLabel = new Map();
    for (const run of textRuns) {
      const floorPx = run.secondary ? textFloorPx.secondary : textFloorPx.body;
      if (run.fontPx >= floorPx) continue;
      const previous = smallByLabel.get(run.label);
      if (!previous || previous.fontPx > run.fontPx) {
        smallByLabel.set(run.label, { ...run, floorPx });
      }
    }
    const smallText = [...smallByLabel.values()]
      .sort((a, b) => a.fontPx - b.fontPx)
      .map(({ label, fontPx, floorPx, secondary }) => ({ label, fontPx, floorPx, secondary }));

    return {
      slideIndex,
      width,
      height,
      clipped,
      maxOverflowPx: clipped.length > 0 ? clipped[0].overflowPx : 0,
      crowded,
      safeMarginPx: Math.round(margin),
      textRuns,
      smallText,
      textFloorPx,
    };
  });
}

/**
 * Browser-side media check: wait until every image has decoded or failed and
 * every video/audio element has loaded metadata or failed, bounded by
 * `timeoutMs`, then list per slide the media that definitely failed: an
 * `img` that finished with `naturalWidth === 0`, or a video/audio element
 * with a media error or no usable source. Waiting on these events instead of
 * `networkidle` alone keeps slow media from being misreported and lets the
 * layout audit measure loaded media. Runs inside the page via
 * `page.evaluate`, so it must stay self-contained.
 */
async function auditMediaInPage({ timeoutMs }) {
  const HAVE_METADATA = 1;
  const NETWORK_NO_SOURCE = 3;
  const sections = [...document.querySelectorAll("section[id]")];

  function sourcesOf(element) {
    if (element.getAttribute("src")) return [element.src];
    return [...element.querySelectorAll("source[src]")].map((source) => source.src);
  }

  function hasFailed(element) {
    return (
      Boolean(element.error) ||
      (element.networkState === NETWORK_NO_SOURCE && element.readyState < HAVE_METADATA)
    );
  }

  function settle(element) {
    if (element.tagName === "IMG") return element.decode().catch(() => {});
    if (element.readyState >= HAVE_METADATA || hasFailed(element)) return Promise.resolve();
    // `preload="none"` never loads on its own, so there is nothing to wait for.
    if (element.preload === "none" && !element.autoplay) return Promise.resolve();
    return new Promise((resolve) => {
      element.addEventListener("loadedmetadata", resolve, { once: true });
      element.addEventListener("error", resolve, { once: true });
      // With <source> children the element itself fires no error; the last
      // source does once every candidate has failed.
      const sources = element.querySelectorAll("source");
      sources[sources.length - 1]?.addEventListener("error", resolve, { once: true });
    });
  }

  const media = sections
    .flatMap((section) => [...section.querySelectorAll("img,video,audio")])
    .filter((element) => sourcesOf(element).length > 0);
  let timer;
  await Promise.race([
    Promise.all(media.map(settle)),
    new Promise((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]);
  clearTimeout(timer);

  return sections.map((section) => {
    const failures = [];
    for (const element of section.querySelectorAll("img,video,audio")) {
      const sources = sourcesOf(element);
      if (sources.length === 0) continue;
      if (element.tagName === "IMG") {
        if (element.complete && element.naturalWidth === 0) {
          failures.push({ url: element.currentSrc || element.src, reason: "failed to decode" });
        }
        continue;
      }
      if (!hasFailed(element)) continue;
      for (const url of sources) failures.push({ url, reason: "failed to load" });
    }
    return failures;
  });
}

/**
 * Map a failed media URL from the rendered copy back to the deck. Returns
 * null for remote URLs (never reported) and for files outside the copied
 * deck directory, which the source-level file check covers. A file that is
 * missing in the deck is reported as not found or a broken symlink rather
 * than with the browser's generic reason.
 */
function mapFailedMedia(failure, renderedDeckDir, deckDir) {
  if (!/^file:/i.test(failure.url)) return null;
  let renderedPath;
  try {
    renderedPath = fileURLToPath(failure.url);
  } catch {
    return null;
  }
  const relative = path.relative(renderedDeckDir, renderedPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;

  const deckPath = path.join(deckDir, relative);
  const diagnosis = diagnoseMissingPath(deckPath, deckDir);
  return {
    reference: relative.split(path.sep).join("/"),
    path: deckPath,
    reason: failure.reason,
    ...diagnosis,
  };
}

/**
 * Launch Playwright Chromium and audit every rendered slide.
 * Returns one entry per rendered slide:
 * { slideIndex, width, height, clipped: [{ label, edge, overflowPx }],
 *   maxOverflowPx, crowded: [{ label, edge, gapPx }], safeMarginPx,
 *   textRuns: [{ label, fontPx, secondary }],
 *   smallText: [{ label, fontPx, floorPx, secondary }],
 *   textFloorPx: { body, secondary }, failedMedia: [{ url, reason }] }.
 */
async function measureSlidesInBrowser(htmlPath, options = {}) {
  const {
    tolerancePx = CLIP_TOLERANCE_PX,
    mediaToleranceRatio = MEDIA_CLIP_TOLERANCE_RATIO,
    safeMarginPx = EDGE_SAFE_MARGIN_PX,
    bodyFloorPx = BODY_TEXT_FLOOR_PX,
    secondaryFloorPx = SECONDARY_TEXT_FLOOR_PX,
    mediaTimeoutMs = MEDIA_SETTLE_TIMEOUT_MS,
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
    const failedMedia = await page.evaluate(auditMediaInPage, {
      timeoutMs: mediaTimeoutMs,
    });
    const audits = await page.evaluate(auditSlidesInPage, {
      tolerancePx,
      mediaToleranceRatio,
      safeMarginPx,
      referenceHeightPx: EDGE_REFERENCE_HEIGHT_PX,
      bodyFloorPx,
      secondaryFloorPx,
      referenceWidthPx: TEXT_REFERENCE_WIDTH_PX,
    });
    return audits.map((audit) => ({
      ...audit,
      failedMedia: failedMedia[audit.slideIndex] || [],
    }));
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
 * Render a deck and audit every slide for clipped visible content, content
 * crowding the edge, text below the readable size floor, and media that fail
 * to load.
 * Returns { status: "measured", slides: [{ slideNumber, clipped, maxOverflowPx,
 * crowded, safeMarginPx, textRuns, smallText, textFloorPx,
 * missingMedia: [{ reference, reason, path }] }] }
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
    const renderedDeckDir = path.dirname(rendered.htmlPath);
    const deckDir = path.dirname(path.resolve(deckPath));

    return {
      status: "measured",
      slides: audits.map((audit) => ({
        slideNumber: renderedToMarkdown[audit.slideIndex] ?? audit.slideIndex + 1,
        clipped: audit.clipped,
        maxOverflowPx: audit.maxOverflowPx,
        crowded: audit.crowded,
        safeMarginPx: audit.safeMarginPx,
        textRuns: audit.textRuns,
        smallText: audit.smallText,
        textFloorPx: audit.textFloorPx,
        missingMedia: audit.failedMedia
          .map((failure) => mapFailedMedia(failure, renderedDeckDir, deckDir))
          .filter(Boolean),
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
  BODY_TEXT_FLOOR_PX,
  CLIP_TOLERANCE_PX,
  EDGE_SAFE_MARGIN_PX,
  MEDIA_CLIP_TOLERANCE_RATIO,
  MEDIA_SETTLE_TIMEOUT_MS,
  SECONDARY_TEXT_FLOOR_PX,
  auditMediaInPage,
  auditSlidesInPage,
  buildRenderedToMarkdownMap,
  detectHiddenSlides,
  measureRenderedSlides,
  measureSlidesInBrowser,
  renderToHtml,
  screenshotSlide,
};
