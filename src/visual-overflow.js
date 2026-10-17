const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  conversionTimeout,
  runConversionSync,
  withBrowser,
} = require("./conversion-runtime");
const { getMarpBin } = require("./preview-runtime");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { detectHiddenSlides } = require("./hidden-slides");
const { buildSlideMap, renderedSlides } = require("./slide-map");
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
// Text whose glyphs intersect text from another block, or media, by more than
// this much on both axes is reported as overlapping (ADR-0001, ISS-0021). The
// glyph box is the line fragment narrowed to the ink of its characters, so
// tight line-height alone never counts; the tolerance absorbs rounding and
// the slack between that box and the actual glyph outlines. Media also allow
// MEDIA_CLIP_TOLERANCE_RATIO of their size, as for clipping.
const OVERLAP_TOLERANCE_PX = 2;
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
function renderToHtml(deckPath, options = {}) {
  const repoRoot = path.resolve(__dirname, "..");
  const marpBinary = getMarpBin(repoRoot);
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

  try {
    fs.mkdirSync(tempDeckDir, { recursive: true });
    copyDeckForRender(deckPath, copiedDeckDir);

    const outputName =
      path.basename(deckPath, path.extname(deckPath)) + ".html";
    const outputPath = path.join(copiedDeckDir, outputName);

    runConversionSync(
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
        ...options,
      },
    );

    return { htmlPath: outputPath, tempRoot };
  } catch (error) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Browser-side audit: for every slide, find visible content that extends past
 * the slide canvas. Visible content is text line boxes and replaced elements,
 * each intersected with the clip rectangles of its overflow-clipping
 * ancestors inside the slide, so intentional crops and trailing margins do not
 * count. It also records the rendered font size of each visible text run and
 * lists the runs below the readable floor, and it lists text whose glyphs
 * collide with text from another block or with media. Runs inside the page
 * via `page.evaluate`, so it must stay self-contained.
 */
function auditSlidesInPage({
  tolerancePx,
  overlapTolerancePx,
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
  // Math renderers stack and pad glyph boxes internally (KaTeX struts,
  // MathJax CHTML), so their boxes do not show where the ink is.
  const MATH = "mjx-container,.katex,math";
  const INLINE_DISPLAYS = new Set(["inline", "contents"]);
  const measureContext = document.createElement("canvas").getContext("2d");

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

  function intersect(a, b) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return right > left && bottom > top ? { left, top, right, bottom } : null;
  }

  // The layout block that owns a piece of content: its nearest non-inline
  // ancestor. A ruby group counts as one block so its annotation and base
  // are never compared with each other.
  function blockOf(element, section) {
    const ruby = element.closest("ruby");
    if (ruby && section.contains(ruby)) return ruby;
    for (let node = element; node && node !== section; node = node.parentElement) {
      const { display } = getComputedStyle(node);
      if (!INLINE_DISPLAYS.has(display) && !display.startsWith("ruby")) return node;
    }
    return section;
  }

  // Glyph box of one line fragment of a text node. The fragment spans the
  // font's ascent and descent, which reaches well past the glyphs (CJK fonts
  // add about a fifth of the size above and below), so stacked lines with a
  // tight line-height overlap as boxes while their ink stays apart. Narrow
  // the fragment vertically to the ink of the characters on that line, using
  // canvas text metrics for the same font.
  function glyphBox(node, rect) {
    const text = node.textContent;
    const range = document.createRange();
    let line = "";
    for (let index = 0; index < text.length; ) {
      const length = text.codePointAt(index) > 0xffff ? 2 : 1;
      range.setStart(node, index);
      range.setEnd(node, index + length);
      const box = range.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      if (box.width > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        line += text.slice(index, index + length);
      }
      index += length;
    }
    line = line.replace(/[\s\u200b]/g, "");
    if (!line) return null;
    const style = getComputedStyle(node.parentElement);
    measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = measureContext.measureText(line);
    const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    if (!(fontHeight > 0)) return rect;
    // The fragment is the font box scaled by any transform on the way.
    const ratio = rect.height / fontHeight;
    const baseline = rect.top + metrics.fontBoundingBoxAscent * ratio;
    return {
      left: rect.left,
      right: rect.right,
      top: Math.max(rect.top, baseline - metrics.actualBoundingBoxAscent * ratio),
      bottom: Math.min(rect.bottom, baseline + metrics.actualBoundingBoxDescent * ratio),
    };
  }

  // Where a replaced element paints inside its box: `object-fit` and
  // `object-position` letterbox images and video, and an SVG draws only its
  // shapes, so the box alone would count empty bands as media.
  function paintedBox(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const inset = (value) => Number.parseFloat(value) || 0;
    const box = {
      left: rect.left + inset(style.borderLeftWidth) + inset(style.paddingLeft),
      top: rect.top + inset(style.borderTopWidth) + inset(style.paddingTop),
      right: rect.right - inset(style.borderRightWidth) - inset(style.paddingRight),
      bottom: rect.bottom - inset(style.borderBottomWidth) - inset(style.paddingBottom),
    };
    const tag = element.tagName.toLowerCase();
    if (tag === "svg") {
      try {
        const bounds = element.getBBox();
        const matrix = element.getScreenCTM();
        if (!matrix || !(bounds.width > 0 && bounds.height > 0)) return box;
        const corners = [
          [bounds.x, bounds.y],
          [bounds.x + bounds.width, bounds.y],
          [bounds.x, bounds.y + bounds.height],
          [bounds.x + bounds.width, bounds.y + bounds.height],
        ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
        const drawn = {
          left: Math.min(...corners.map((point) => point.x)),
          top: Math.min(...corners.map((point) => point.y)),
          right: Math.max(...corners.map((point) => point.x)),
          bottom: Math.max(...corners.map((point) => point.y)),
        };
        return style.overflowX === "visible" && style.overflowY === "visible"
          ? drawn
          : intersect(drawn, box);
      } catch {
        return box;
      }
    }
    const naturalWidth = tag === "img" ? element.naturalWidth : element.videoWidth;
    const naturalHeight = tag === "img" ? element.naturalHeight : element.videoHeight;
    const fit = style.objectFit;
    if (!(naturalWidth > 0 && naturalHeight > 0) || fit === "fill" || fit === "cover") return box;
    const width = box.right - box.left;
    const height = box.bottom - box.top;
    let factor = Math.min(width / naturalWidth, height / naturalHeight);
    if (fit === "none") factor = 1;
    if (fit === "scale-down") factor = Math.min(factor, 1);
    const [positionX, positionY] = style.objectPosition.split(/\s+/);
    const offset = (value, free) =>
      value && value.endsWith("%") ? (free * Number.parseFloat(value)) / 100 : Number.parseFloat(value) || 0;
    const left = box.left + offset(positionX, width - naturalWidth * factor);
    const top = box.top + offset(positionY, height - naturalHeight * factor);
    return intersect(box, {
      left,
      top,
      right: left + naturalWidth * factor,
      bottom: top + naturalHeight * factor,
    });
  }

  function hasBackground(style) {
    if (style.backgroundImage && style.backgroundImage !== "none") return true;
    const color = style.backgroundColor;
    if (color === "transparent") return false;
    const alpha =
      color.match(/\/\s*([\d.]+)%?\s*\)$/) ||
      color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/);
    return !alpha || Number.parseFloat(alpha[1]) > 0;
  }

  // Text may sit on media on purpose: a caption or overlay inside the same
  // figure, an inline icon in the text's own block, a label drawn on its own
  // background box (callout, card, badge), or media placed with absolute
  // positioning as a decoration or deliberate overlay.
  function isIntendedOverlay(text, media, section) {
    const figure = text.element.closest("figure");
    if (figure && section.contains(figure) && figure.contains(media.element)) return true;
    if (text.block === media.block) return true;
    for (let node = text.element; node && node !== section; node = node.parentElement) {
      if (node.contains(media.element)) break;
      const style = getComputedStyle(node);
      if (INLINE_DISPLAYS.has(style.display) || !hasBackground(style)) continue;
      const backdrop = node.getBoundingClientRect();
      if (text.glyphs.top >= backdrop.top && text.glyphs.bottom <= backdrop.bottom &&
        text.glyphs.left >= backdrop.left && text.glyphs.right <= backdrop.right) {
        return true;
      }
    }
    for (let node = media.element; node && node !== section; node = node.parentElement) {
      if (node.contains(text.element)) break;
      const { position } = getComputedStyle(node);
      if (position === "absolute" || position === "fixed") return true;
    }
    return false;
  }

  // Text that collides with text from another block or with media, measured
  // on glyph boxes. Header/footer bands, math, nested SVG text, aria-hidden
  // decorations, and parts cropped by an `overflow` ancestor are left out.
  function findOverlaps(boxes, section, scale) {
    const items = [];
    for (const box of boxes) {
      const element = box.element;
      if (element.closest("header,footer,[aria-hidden='true']")) continue;
      if (!box.media && element.closest(MATH)) continue;
      const shape = box.media ? paintedBox(element) : box.rect;
      const visible = shape && clipByAncestors(shape, element, section);
      if (!visible) continue;
      items.push({
        ...box,
        visible,
        block: blockOf(box.media ? element.parentElement : element, section),
      });
    }

    const glyphsOf = (item) => {
      if (item.glyphs === undefined) {
        const glyphs = item.media ? item.visible : glyphBox(item.node, item.rect);
        item.glyphs = glyphs && intersect(glyphs, item.visible);
      }
      return item.glyphs;
    };

    const byPair = new Map();
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        let first = items[i];
        let second = items[j];
        if (first.media && second.media) continue;
        if (first.block === second.block) continue;
        if (!intersect(first.visible, second.visible)) continue;
        if (first.media) [first, second] = [second, first];
        if (!glyphsOf(first) || !glyphsOf(second)) continue;
        if (second.media && isIntendedOverlay(first, second, section)) continue;
        const overlap = intersect(first.glyphs, second.glyphs);
        if (!overlap) continue;
        const widthPx = (overlap.right - overlap.left) / scale;
        const heightPx = (overlap.bottom - overlap.top) / scale;
        const allowed = (extent) =>
          second.media ? Math.max(overlapTolerancePx, extent * mediaToleranceRatio) : overlapTolerancePx;
        const extent = second.glyphs;
        if (widthPx <= allowed((extent.right - extent.left) / scale)) continue;
        if (heightPx <= allowed((extent.bottom - extent.top) / scale)) continue;
        const overlapPx = Math.round(Math.min(widthPx, heightPx));
        const key = `${first.label}\n${second.label}`;
        const previous = byPair.get(key);
        if (!previous || previous.overlapPx < overlapPx) {
          byPair.set(key, {
            first: first.label,
            second: second.label,
            widthPx: Math.round(widthPx),
            heightPx: Math.round(heightPx),
            overlapPx,
          });
        }
      }
    }
    return [...byPair.values()].sort((a, b) => b.overlapPx - a.overlapPx);
  }

  function roundTenth(value) {
    return Math.round(value * 10) / 10;
  }

  return [...document.querySelectorAll("svg[data-marpit-svg] > foreignObject > section[id]")].map((section, slideIndex) => {
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
        boxes.push({ rect, element: parent, node, media: false, label });
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
    const overlaps = findOverlaps(boxes, section, scale);
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
      overlaps,
      maxOverlapPx: overlaps.length > 0 ? overlaps[0].overlapPx : 0,
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
  const sections = [...document.querySelectorAll("svg[data-marpit-svg] > foreignObject > section[id]")];

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
 * Browser-side render error check: list per slide the math and diagrams that
 * rendered as an error instead of their content. It finds KaTeX errors
 * (`.katex-error`), MathJax errors (`[data-mjx-error]`, also inside Mermaid
 * SVGs), and Mermaid fences that scripts/mermaid-plugin.js left as source
 * (`[data-marpagent-render-error="mermaid"]`). Only painted errors count:
 * copies hidden by CSS, accessibility copies, SVG definitions, and errors
 * outside the canvas are left out, as are math errors inside code examples.
 * Errors with the same kind, message, and source are merged with a count.
 * Runs inside the page via `page.evaluate`, so it must stay self-contained.
 */
function auditRenderErrorsInPage({ includeOccurrences = false } = {}) {
  const SOURCES = [
    { kind: "math", engine: "katex", selector: ".katex-error" },
    { kind: "math", engine: "mathjax", selector: "[data-mjx-error]" },
    {
      kind: "diagram",
      engine: "mermaid",
      selector: "[data-marpagent-render-error='mermaid']",
    },
  ];
  // SVG containers whose content is referenced, not painted in place, and
  // the hidden copies math renderers keep for assistive technology.
  const NOT_PAINTED =
    "defs,symbol,clipPath,mask,pattern,marker,mjx-assistive-mml,.katex-mathml";
  const MESSAGE_MAX_LENGTH = 200;
  const SOURCE_MAX_LENGTH = 48;

  function normalize(text, maxLength) {
    const clean = String(text || "")
      .replace(/​/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return clean.length > maxLength
      ? `${clean.slice(0, maxLength - 1)}…`
      : clean;
  }

  function clipByAncestors(rect, element, section) {
    let { left, top, right, bottom } = rect;
    for (
      let node = element.parentElement;
      node && node !== section;
      node = node.parentElement
    ) {
      const style = getComputedStyle(node);
      if (style.overflowX === "visible" && style.overflowY === "visible")
        continue;
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

  function intersect(a, b) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return right > left && bottom > top ? { left, top, right, bottom } : null;
  }

  // SVG content such as a MathJax `<g>` has no CSS box of its own, so
  // `checkVisibility()` cannot be trusted for it. Check the computed style of
  // each SVG ancestor up to the nearest CSS box, then that box itself.
  function isVisible(element, section) {
    if (element.closest(NOT_PAINTED)) return false;
    let host = element;
    if (element instanceof SVGElement) {
      if (getComputedStyle(element).visibility !== "visible") return false;
      for (
        ;
        host instanceof SVGElement && host !== section;
        host = host.parentElement
      ) {
        const style = getComputedStyle(host);
        if (style.display === "none" || Number.parseFloat(style.opacity) === 0)
          return false;
      }
      if (!host || host === section) return true;
      if (!host.checkVisibility({ opacityProperty: true })) return false;
    } else if (
      !host.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
      })
    ) {
      return false;
    }
    // The legacy `clip` property is used almost only to hide text visually.
    for (let node = host; node && node !== section; node = node.parentElement) {
      if (getComputedStyle(node).clip.startsWith("rect")) return false;
    }
    return true;
  }

  function isPainted(element, section, canvas, scale) {
    const rects =
      element instanceof SVGElement
        ? [element.getBoundingClientRect()]
        : [...element.getClientRects()];
    return rects.some((rect) => {
      if (!(rect.width > 0 && rect.height > 0)) return false;
      const clipped = clipByAncestors(rect, element, section);
      const shown = clipped && intersect(clipped, canvas);
      return Boolean(
        shown &&
        shown.right - shown.left > scale &&
        shown.bottom - shown.top > scale,
      );
    });
  }

  function describeError(source, element) {
    if (source.engine === "katex") {
      return {
        message: normalize(
          (element.getAttribute("title") || "").replace(/^ParseError:\s*/, ""),
          MESSAGE_MAX_LENGTH,
        ),
        source: normalize(element.textContent, SOURCE_MAX_LENGTH),
      };
    }
    if (source.engine === "mathjax") {
      // Prefer the TeX that MathJax records on the math node; the error's
      // own text also contains its tooltip `<title>`.
      const math = element.closest("[data-latex]");
      let text = math ? math.getAttribute("data-latex") : "";
      if (!text) {
        const copy = element.cloneNode(true);
        for (const label of copy.querySelectorAll("title,desc")) label.remove();
        text = copy.textContent;
      }
      return {
        message: normalize(
          element.getAttribute("data-mjx-error"),
          MESSAGE_MAX_LENGTH,
        ),
        source: normalize(text, SOURCE_MAX_LENGTH),
      };
    }
    return {
      message: normalize(
        element.getAttribute("data-marpagent-render-message"),
        MESSAGE_MAX_LENGTH,
      ),
      source: "",
    };
  }

  return [
    ...document.querySelectorAll(
      "svg[data-marpit-svg] > foreignObject > section[id]",
    ),
  ].map((section) => {
    const canvasRect = section.getBoundingClientRect();
    const canvas = {
      left: canvasRect.left,
      top: canvasRect.top,
      right: canvasRect.right,
      bottom: canvasRect.bottom,
    };
    const scale = canvasRect.width / section.offsetWidth || 1;
    const byKey = new Map();
    for (const source of SOURCES) {
      const elements = [...section.querySelectorAll(source.selector)];
      for (const [index, element] of elements.entries()) {
        // One error may nest another copy of the same marker; count the outer one.
        const outer =
          element.parentElement &&
          element.parentElement.closest(source.selector);
        if (outer && section.contains(outer)) continue;
        if (source.kind === "math" && element.closest("pre,code")) continue;
        if (
          !isVisible(element, section) ||
          !isPainted(element, section, canvas, scale)
        )
          continue;
        const { message, source: text } = describeError(source, element);
        const key = [source.kind, source.engine, message, text].join("\n");
        const previous = byKey.get(key);
        if (previous) {
          previous.count += 1;
          if (includeOccurrences)
            previous.occurrences.push(`${source.engine}:${index}`);
        } else {
          byKey.set(key, {
            kind: source.kind,
            engine: source.engine,
            message,
            source: text,
            count: 1,
            ...(includeOccurrences
              ? { occurrences: [`${source.engine}:${index}`] }
              : {}),
          });
        }
      }
    }
    return [...byKey.values()];
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

// Merge findings seen through overlapping scroll viewports. Keep the worst
// measurement for each representative finding rather than counting it twice.
function mergeScrollAudit(target, next) {
  const merge = (field, keyOf, prefer) => {
    const byKey = new Map(target[field].map((item) => [keyOf(item), item]));
    for (const item of next[field]) {
      const key = keyOf(item);
      const previous = byKey.get(key);
      if (!previous || prefer(item, previous)) byKey.set(key, item);
    }
    target[field] = [...byKey.values()];
  };
  merge(
    "clipped",
    (item) => `${item.label}:${item.edge}`,
    (a, b) => a.overflowPx > b.overflowPx,
  );
  merge(
    "crowded",
    (item) => `${item.label}:${item.edge}`,
    (a, b) => a.gapPx < b.gapPx,
  );
  merge(
    "textRuns",
    (item) => `${item.label}:${item.fontPx}:${item.secondary}`,
    () => false,
  );
  merge(
    "smallText",
    (item) => `${item.label}:${item.secondary}`,
    (a, b) => a.fontPx < b.fontPx,
  );
  merge(
    "overlaps",
    (item) => `${item.first}:${item.second}`,
    (a, b) => a.overlapPx > b.overlapPx,
  );
  target.maxOverflowPx = Math.max(target.maxOverflowPx, next.maxOverflowPx);
  target.maxOverlapPx = Math.max(target.maxOverlapPx, next.maxOverlapPx);
}

function mergeRenderErrors(target, next) {
  const keyOf = (item) =>
    JSON.stringify([item.kind, item.engine, item.message, item.source]);
  const byKey = new Map(target.map((item) => [keyOf(item), item]));
  for (const item of next) {
    const previous = byKey.get(keyOf(item));
    if (previous) {
      previous.occurrences = [
        ...new Set([...previous.occurrences, ...item.occurrences]),
      ];
      previous.count = previous.occurrences.length;
    } else {
      byKey.set(keyOf(item), item);
    }
  }
  return [...byKey.values()];
}

/**
 * Launch Playwright Chromium and audit every rendered slide.
 * Returns one entry per rendered slide:
 * { slideIndex, width, height, clipped: [{ label, edge, overflowPx }],
 *   maxOverflowPx, crowded: [{ label, edge, gapPx }], safeMarginPx,
 *   textRuns: [{ label, fontPx, secondary }],
 *   smallText: [{ label, fontPx, floorPx, secondary }],
 *   textFloorPx: { body, secondary },
 *   overlaps: [{ first, second, widthPx, heightPx, overlapPx }], maxOverlapPx,
 *   failedMedia: [{ url, reason }],
 *   renderErrors: [{ kind, engine, message, source, count }] }.
 */
async function measureSlidesInBrowser(htmlPath, options = {}) {
  const {
    tolerancePx = CLIP_TOLERANCE_PX,
    overlapTolerancePx = OVERLAP_TOLERANCE_PX,
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

  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(pathToFileURL(htmlPath).href, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => document.fonts.ready);
    const failedMedia = await page.evaluate(auditMediaInPage, {
      timeoutMs: mediaTimeoutMs,
    });
    const auditOptions = {
      tolerancePx,
      overlapTolerancePx,
      mediaToleranceRatio,
      safeMarginPx,
      referenceHeightPx: EDGE_REFERENCE_HEIGHT_PX,
      bodyFloorPx,
      secondaryFloorPx,
      referenceWidthPx: TEXT_REFERENCE_WIDTH_PX,
    };
    const scrollAreas = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "svg[data-marpit-svg] > foreignObject > section[id]",
        ),
      ].map((section) => {
        const body = section.matches('[data-marpagent-scroll="true"]')
          ? section.querySelector(":scope > .marpagent-scroll-body")
          : null;
        return body
          ? {
              viewportHeight: body.clientHeight,
              contentHeight: body.scrollHeight,
              maxScrollTop: Math.max(0, body.scrollHeight - body.clientHeight),
              horizontalOverflowPx: Math.max(
                0,
                body.scrollWidth - body.clientWidth,
              ),
            }
          : null;
      }),
    );
    const audits = await page.evaluate(auditSlidesInPage, auditOptions);
    const renderErrors = await page.evaluate(auditRenderErrorsInPage, {
      includeOccurrences: true,
    });
    const steps = Math.max(
      0,
      ...scrollAreas.map((area) =>
        area && area.viewportHeight > 0
          ? Math.ceil(area.maxScrollTop / (area.viewportHeight * 0.8))
          : 0,
      ),
    );
    // Visit the whole body, including its middle. Overlapping viewports keep
    // a line or an error crossing a viewport boundary visible in a later pass.
    for (let step = 1; step <= steps; step += 1) {
      await page.evaluate(
        async ({ step, scrollAreas }) => {
          const sections = [
            ...document.querySelectorAll(
              "svg[data-marpit-svg] > foreignObject > section[id]",
            ),
          ];
          sections.forEach((section, index) => {
            const area = scrollAreas[index];
            if (!area) return;
            const body = section.querySelector(
              ":scope > .marpagent-scroll-body",
            );
            body.scrollTop = Math.min(
              area.maxScrollTop,
              step * area.viewportHeight * 0.8,
            );
          });
          await new Promise(requestAnimationFrame);
        },
        { step, scrollAreas },
      );
      const next = await page.evaluate(auditSlidesInPage, auditOptions);
      const nextErrors = await page.evaluate(auditRenderErrorsInPage, {
        includeOccurrences: true,
      });
      for (const audit of audits) {
        const index = audit.slideIndex;
        if (!scrollAreas[index]) continue;
        mergeScrollAudit(audit, next[index]);
        renderErrors[index] = mergeRenderErrors(
          renderErrors[index],
          nextErrors[index],
        );
      }
    }
    for (const audit of audits) {
      const area = scrollAreas[audit.slideIndex];
      if (!area) continue;
      // overflow-x:hidden is a presentation guard, not permission to hide
      // oversized body content from the validator.
      if (area.horizontalOverflowPx > tolerancePx) {
        audit.clipped.push({
          label: "scrollable body",
          edge: "right",
          overflowPx: area.horizontalOverflowPx,
        });
        audit.maxOverflowPx = Math.max(
          audit.maxOverflowPx,
          area.horizontalOverflowPx,
        );
      }
      audit.scrollable = area;
    }
    return audits.map((audit) => ({
      ...audit,
      failedMedia: failedMedia[audit.slideIndex] || [],
      renderErrors: (renderErrors[audit.slideIndex] || []).map(
        ({ occurrences, ...error }) => error,
      ),
    }));
  }, { ...options, chromium: options.chromium || playwright.chromium });
}

/**
 * Build a mapping from rendered section index (0-based) to Markdown slide
 * index (1-based) from the slide map (src/slide-map.js). Hidden slides are
 * absent from the render; empty slides are rendered and keep their index.
 */
function buildRenderedToMarkdownMap(markdown, options = {}) {
  const slideMap = options.slideMap || buildSlideMap(markdown, options);
  return renderedSlides(slideMap).map((entry) => entry.slide);
}

/**
 * Render a deck and audit every slide for clipped visible content, content
 * crowding the edge, text below the readable size floor, overlapping text,
 * media that fail to load, and math or diagrams that rendered as an error.
 * Returns { status: "measured", slides: [{ slideNumber, clipped, maxOverflowPx,
 * crowded, safeMarginPx, textRuns, smallText, textFloorPx, overlaps,
 * maxOverlapPx, missingMedia: [{ reference, reason, path }],
 * renderErrors: [{ kind, engine, message, source, count }], renderedSlide }] }
 * where slideNumber is the Markdown slide index and renderedSlide the 1-based
 * rendered position, both taken from the slide map (`options.slideMap`, or
 * built from the deck), or
 * { status: "skipped", reason, slides: [] } when rendering or the browser is
 * unavailable. In strict mode a failure throws instead of being skipped.
 */
async function measureRenderedSlides(deckPath, options = {}) {
  const { onDiagnostic, strictVisual = false } = options;
  const timeoutMs = options.timeoutMs ?? conversionTimeout();
  const started = Date.now();
  let tempRoot;
  try {
    if (process.env.MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE === "1") {
      throw new Error("Forced visual check failure via MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE.");
    }

    const markdown = fs.readFileSync(deckPath, "utf8");
    const rendered = renderToHtml(deckPath, { timeoutMs });
    tempRoot = rendered.tempRoot;

    const audits = await measureSlidesInBrowser(rendered.htmlPath, {
      timeoutMs: Math.max(1, timeoutMs - (Date.now() - started)),
    });
    const renderedToMarkdown = buildRenderedToMarkdownMap(markdown, {
      slideMap: options.slideMap,
    });
    const renderedDeckDir = path.dirname(rendered.htmlPath);
    const deckDir = path.dirname(path.resolve(deckPath));

    return {
      status: "measured",
      slides: audits.map((audit) => ({
        slideNumber: renderedToMarkdown[audit.slideIndex] ?? audit.slideIndex + 1,
        renderedSlide: audit.slideIndex + 1,
        clipped: audit.clipped,
        maxOverflowPx: audit.maxOverflowPx,
        crowded: audit.crowded,
        safeMarginPx: audit.safeMarginPx,
        textRuns: audit.textRuns,
        smallText: audit.smallText,
        textFloorPx: audit.textFloorPx,
        overlaps: audit.overlaps,
        maxOverlapPx: audit.maxOverlapPx,
        missingMedia: audit.failedMedia
          .map((failure) => mapFailedMedia(failure, renderedDeckDir, deckDir))
          .filter(Boolean),
        renderErrors: audit.renderErrors || [],
        ...(audit.scrollable ? { scrollable: audit.scrollable } : {}),
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
async function screenshotSlide(htmlPath, slideId, options = {}) {
  return withBrowser(async (browser) => {
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
  }, options);
}

module.exports = {
  BODY_TEXT_FLOOR_PX,
  CLIP_TOLERANCE_PX,
  EDGE_SAFE_MARGIN_PX,
  MEDIA_CLIP_TOLERANCE_RATIO,
  MEDIA_SETTLE_TIMEOUT_MS,
  OVERLAP_TOLERANCE_PX,
  SECONDARY_TEXT_FLOOR_PX,
  auditMediaInPage,
  auditRenderErrorsInPage,
  auditSlidesInPage,
  buildRenderedToMarkdownMap,
  detectHiddenSlides,
  measureRenderedSlides,
  measureSlidesInBrowser,
  renderToHtml,
  screenshotSlide,
};
