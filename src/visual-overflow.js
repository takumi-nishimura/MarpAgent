const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { splitSlideRawBlocks } = require("./markdown-slides");

function emitDiagnostic(onDiagnostic, payload) {
  if (typeof onDiagnostic === "function") {
    onDiagnostic(payload);
  }
}

/**
 * Render deck markdown to self-contained HTML via Marp CLI.
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
 * Launch Playwright Chromium and measure overflow on each rendered slide.
 * Returns an array of { slideIndex, scrollHeight, clientHeight, overflowPx }
 * for slides that overflow.
 */
async function measureOverflowInBrowser(htmlPath) {
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
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });

    const results = await page.evaluate(() => {
      const sections = document.querySelectorAll("section[id]");
      const overflows = [];
      let index = 0;
      for (const section of sections) {
        const scrollHeight = section.scrollHeight;
        const clientHeight = section.clientHeight;
        if (scrollHeight > clientHeight) {
          overflows.push({
            slideIndex: index,
            scrollHeight,
            clientHeight,
            overflowPx: scrollHeight - clientHeight,
          });
        }
        index++;
      }
      return overflows;
    });

    return results;
  } finally {
    await browser.close();
  }
}

/**
 * Detect hidden slides from markdown source.
 * Returns a Set of 1-based slide numbers that are hidden.
 */
function detectHiddenSlides(markdown) {
  const hidden = new Set();
  const rawSlides = splitSlideRawBlocks(markdown);

  for (const slide of rawSlides) {
    if (/<!--\s*hide:\s*true\s*-->/.test(slide.raw)) {
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
 * Measure visual overflow for a deck file.
 * Returns an array of { slideNumber, scrollHeight, clientHeight, overflowPx }.
 * Returns [] if Playwright is unavailable or any error occurs.
 */
async function measureVisualOverflow(deckPath, options = {}) {
  const { onDiagnostic } = options;
  let tempRoot;
  try {
    if (process.env.MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE === "1") {
      throw new Error("Forced visual check failure via MARP_AGENT_FORCE_VISUAL_CHECK_FAILURE.");
    }

    const markdown = fs.readFileSync(deckPath, "utf8");
    const rendered = renderToHtml(deckPath);
    tempRoot = rendered.tempRoot;

    const overflows = await measureOverflowInBrowser(rendered.htmlPath);
    if (overflows.length === 0) return [];

    const renderedToMarkdown = buildRenderedToMarkdownMap(markdown);

    return overflows.map((o) => ({
      slideNumber: renderedToMarkdown[o.slideIndex] ?? o.slideIndex + 1,
      scrollHeight: o.scrollHeight,
      clientHeight: o.clientHeight,
      overflowPx: o.overflowPx,
    }));
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
    return [];
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
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });

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
  buildRenderedToMarkdownMap,
  detectHiddenSlides,
  measureOverflowInBrowser,
  measureVisualOverflow,
  renderToHtml,
  screenshotSlide,
};
