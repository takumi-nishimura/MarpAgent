const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");

const repo = process.argv[2];
const run = fs.mkdtempSync(path.join(os.tmpdir(), "marp-i56-adjustments-"));
const readCommit = (file) => execFileSync("git", ["show", `756b461:${file}`], { cwd: repo });
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const conditions = JSON.parse(readCommit("fixtures/layout-baselines/baseline/conditions.json"));
const original = readCommit("fixtures/layout-baselines/slide.md").toString();
assert.equal(hash(original), conditions.hashes["fixtures/layout-baselines/slide.md"]);
const fontDir = path.join(run, "fonts");
fs.mkdirSync(fontDir);
fs.mkdirSync(path.join(run, "font-cache"));
for (const font of conditions.fonts) {
  const file = `NotoSansJP-${font.weight}.ttf`;
  const data = fs.readFileSync(path.join("/tmp/marp-i54-baseline/fonts", file));
  assert.equal(hash(data), font.sha256);
  fs.writeFileSync(path.join(fontDir, file), data);
}
const fontConfig = path.join(run, "fonts.conf");
fs.writeFileSync(fontConfig, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>/usr/share/fonts</dir><dir>${fontDir}</dir><cachedir>${run}/font-cache</cachedir><include ignore_missing="yes">/etc/fonts/conf.d</include></fontconfig>`);
process.env.FONTCONFIG_FILE = fontConfig;
const { chromium } = require(path.join(repo, "node_modules/playwright"));
const { createConfiguredMarp, buildSlideMap } = require(path.join(repo, "src/slide-map"));
const { auditSlidesInPage } = require(path.join(repo, "src/visual-overflow"));
const { findClassFindings } = require(path.join(repo, "src/class-diagnostics"));
const slideMap = buildSlideMap(original);
assert.equal(slideMap.length, 14);
const oldCase = slideMap[5].raw;
assert.ok(oldCase.includes("<!-- case: columns-portrait -->"));
const oldGrid = '<div class="grid grid-cols-12 gap-6 items-start" data-region="columns">';
const newGrid = '<div class="body">\n<div class="grid grid-cols-12 gap-6 items-stretch fill" data-region="columns">';
assert.equal(oldCase.split(oldGrid).length, 2);
const newCase = oldCase.replace(oldGrid, newGrid)
  .replace('class="col-span-8 min-w-0"', 'class="col-span-8 min-w-0 box"') + "\n</div>\n";
const modified = original.replace(oldCase, newCase);
fs.writeFileSync(path.join(run, "before-slide.md"), original);
fs.writeFileSync(path.join(run, "body-slide.md"), modified);
const diff = spawnSync("git", ["diff", "--no-index", "--", path.join(run, "before-slide.md"), path.join(run, "body-slide.md")], { encoding: "utf8", cwd: repo });
assert.equal(diff.status, 1);
const sourcePath = "fixtures/layout-baselines/slide.md";
fs.writeFileSync(path.join(run, "body.patch"), diff.stdout
  .replaceAll(`a${run}/before-slide.md`, `a/${sourcePath}`)
  .replaceAll(`b${run}/body-slide.md`, `b/${sourcePath}`));
const auditOptions = {
  tolerancePx: 2, overlapTolerancePx: 2, mediaToleranceRatio: 0.02,
  safeMarginPx: 20, referenceHeightPx: 720, referenceWidthPx: 1280,
  bodyFloorPx: 12, secondaryFloorPx: 8,
};
const assets = new Map();
function embedAssets(source) {
  return source.replace(/src="(assets\/img\/[^\"]+\.svg)"/g, (_, asset) => {
    if (!assets.has(asset)) {
      const file = `fixtures/layout-baselines/${asset}`;
      const bytes = readCommit(file);
      assert.equal(hash(bytes), conditions.hashes[file]);
      assets.set(asset, bytes.toString("base64"));
    }
    return `src="data:image/svg+xml;base64,${assets.get(asset)}"`;
  });
}
async function platformFonts(page, selector) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    const { fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId });
    return fonts;
  } finally {
    await session.detach();
  }
}
async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const theme of ["lab", "muji", "toshiba"]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
      const css = fs.readFileSync(path.join(repo, "themes", `${theme}.css`), "utf8");
      const variants = [];
      for (const [variant, source] of [["baseline", original], ["body", modified]]) {
        const marp = createConfiguredMarp();
        marp.themeSet.add(css);
        const rendered = marp.render(embedAssets(source).replace(/^theme: lab$/m, `theme: ${theme}`));
        await page.setContent(`<style>body { margin: 0; } ${rendered.css}</style>${rendered.html}`);
        await page.evaluate(() => document.fonts.ready);
        await page.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
        const audits = await page.evaluate(auditSlidesInPage, auditOptions);
        const geometry = await page.evaluate(() => {
          const section = document.querySelector('section[id="6"]');
          const box = (node) => { const { x, y, width, height, bottom } = node.getBoundingClientRect(); return { x, y, width, height, bottom }; };
          const evidence = section.querySelector('[data-region="evidence"]');
          const interpretation = section.querySelector('[data-region="interpretation"]');
          const image = section.querySelector("img");
          const caption = section.querySelector("figcaption");
          const gap = parseFloat(getComputedStyle(evidence.parentElement).columnGap);
          const rect = image.getBoundingClientRect();
          return {
            text: section.textContent.replaceAll("\u200b", "").replace(/\s+/g, " ").trim(),
            caption: caption.textContent,
            alt: image.alt,
            image: { ...box(image), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, objectFit: getComputedStyle(image).objectFit },
            painted: {
              width: image.naturalWidth * Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight),
              height: image.naturalHeight * Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight),
            },
            captionBox: box(caption),
            ratio: (evidence.getBoundingClientRect().width + gap) / (interpretation.getBoundingClientRect().width + gap),
            emphasis: { text: section.querySelector("strong").textContent.replaceAll("\u200b", ""), color: getComputedStyle(section.querySelector("strong")).color, weight: getComputedStyle(section.querySelector("strong")).fontWeight },
          };
        });
        const headingFonts = await platformFonts(page, 'section[id="6"] h2');
        const bodyFonts = await platformFonts(page, 'section[id="6"] [data-region="interpretation"] p');
        for (const fonts of [headingFonts, bodyFonts]) {
          assert.ok(fonts.some((font) => font.postScriptName.startsWith("NotoSansJP-") && font.glyphCount > 0));
        }
        const screenshot = `${theme}-${variant}.png`;
        await page.locator('section[id="6"]').screenshot({ path: path.join(run, screenshot) });
        const classFindings = findClassFindings(source.replace(/^theme: lab$/m, `theme: ${theme}`));
        assert.deepEqual(classFindings, []);
        variants.push({ variant, geometry, headingFonts, bodyFonts, classFindings,
          audit: audits[5], neighborAudits: [4, 6].map((index) => ({ page: index + 1, ...audits[index] })), screenshot });
      }
      assert.equal(variants[0].geometry.text, variants[1].geometry.text);
      assert.deepEqual(variants[0].geometry.emphasis, variants[1].geometry.emphasis);
      for (const variant of variants) assert.ok(Math.abs(variant.geometry.ratio - 2) < 0.001);
      for (let index = 0; index < 2; index++) assert.deepEqual(variants[0].neighborAudits[index], variants[1].neighborAudits[index]);
      const peer = JSON.parse(readCommit(`fixtures/layout-baselines/baseline/${theme}/observations.json`));
      const peerAudit = peer.audits.find((audit) => audit.case === "columns-portrait");
      assert.equal(variants[0].audit.maxOverflowPx, peerAudit.maxOverflowPx);
      assert.equal(variants[1].audit.clipped.length, 0);
      assert.equal(variants[1].audit.overlaps.length, 0);
      assert.equal(variants[1].audit.smallText.length, 0);
      results.push({ theme, cssSha256: hash(css), peerBaselineOverflowPx: peerAudit.maxOverflowPx, variants });
      await context.close();
    }
    const report = {
      capturedAt: new Date().toISOString(),
      sourceRevision: "756b461", fixtureRevision: conditions.fixtureRevision,
      implementationRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(),
      sourceSha256: hash(original), bodySourceSha256: hash(modified),
      node: process.version, browser: browser.version(), viewport: { width: 1280, height: 720 }, dpr: 1,
      fonts: conditions.fonts, fontPolicy: "Identical hashed TTFs copied read-only from the baseline run into a private Fontconfig directory; Google Fonts blocked; target-page usage checked by Chromium CDP.",
      auditOptions, results,
      adjustmentLedger: {
        peerInline: { pageSpecificCssRules: 0, inlineElements: 1, inlineDeclarations: 1, imageMaxHeightPx: 480, layoutWrappers: 3 },
        body: { pageSpecificCssRules: 0, inlineElements: 0, inlineDeclarations: 0, layoutWrappers: 4, sharedClassesAdded: ["body", "fill", "box"], sharedClassesReplaced: [{ from: "items-start", to: "items-stretch" }], columnSplit: "8:4 unchanged" },
      },
      limits: ["One portrait boundary case plus adjacent pages only; not all 14 layouts after migration.", "Font and geometry checks do not establish presentation-distance readability or semantic/scientific correctness.", "No Firefox/PDF/PPTX/scroll/paper rerun or integrated full gate in this trial."]
    };
    fs.writeFileSync(path.join(run, "report.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ run, results: results.map(({ theme, variants }) => ({ theme, baselineOverflowPx: variants[0].audit.maxOverflowPx, bodyOverflowPx: variants[1].audit.maxOverflowPx, bodyImage: variants[1].geometry.image, bodyPainted: variants[1].geometry.painted, caption: variants[1].geometry.captionBox })) }, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error({ run, error: error.stack }); process.exitCode = 1; });
