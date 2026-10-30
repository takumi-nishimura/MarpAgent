// Phase 2 reuses the immutable phase 1 recipes and measurement definitions.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { gunzipSync } = require("node:zlib");
const { execFileSync } = require("node:child_process");
const { parseArgs } = require("node:util");
const root = path.resolve(__dirname, "../../..");
const prior = path.join(__dirname, "../ISS-0047-layout-comparison-2026-10-30");
const manifest = require(path.join(prior, "manifest.json"));
const recipe = require(path.join(prior, "recipes.cjs"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
function readPin(pin) {
    const local = path.join(root, pin.path);
    const bytes = fs.existsSync(local) && sha(fs.readFileSync(local)) === pin.sha256
        ? fs.readFileSync(local) : execFileSync("git", ["cat-file", "blob", pin.blob], { cwd: root });
    assert.equal(sha(bytes), pin.sha256, pin.path);
    return bytes;
}
function withMedia(markdown, svgFont) {
    return markdown.replace(/src="assets\/img\/([^"<>]+)"/g, (_, name) => {
        const svg = readPin(manifest.sources.assets[name]).toString().replace(/(<svg\b[^>]*>)/,
            '$1<style>@font-face{font-family:"Noto Sans JP";font-weight:100 900;src:url(data:font/woff2;base64,' + svgFont + ');}</style>');
        return 'data-source="' + name + '" data-label-size="' + (name.startsWith("stage") ? 28 : 24) + '" src="data:image/svg+xml;base64,' + Buffer.from(svg).toString("base64") + '"';
    });
}

async function measure(page) {
    const { auditSlidesInPage } = require(path.join(root, "src/visual-overflow"));
    const audits = await page.evaluate(auditSlidesInPage, {
        tolerancePx: 2, overlapTolerancePx: 2, mediaToleranceRatio: 0.02,
        safeMarginPx: 20, referenceWidthPx: 1280, referenceHeightPx: 720,
        bodyFloorPx: 12, secondaryFloorPx: 8,
    });
    const metrics = await page.locator("section").evaluateAll((sections) => sections.map((section) => {
        const slide = section.getBoundingClientRect();
        const rect = (element) => {
            if (!element) return null;
            const r = element.getBoundingClientRect();
            return { left: r.left - slide.left, top: r.top - slide.top, bottom: r.bottom - slide.top, width: r.width, height: r.height };
        };
        const lines = (element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top * 100) / 100)).size;
        };
        const text = (element) => element.textContent.replaceAll("\u200b", "").replace(/\s+/g, " ").trim();
        const typography = [...section.querySelectorAll("h2,h3,p,figcaption,.footnote,strong,mark")].map((element) => {
            const style = getComputedStyle(element);
            return { tag: element.tagName, text: text(element), font: style.fontFamily, size: style.fontSize, weight: style.fontWeight,
                lineHeight: style.lineHeight, tracking: style.letterSpacing, color: style.color, background: style.background };
        });
        const media = [...section.querySelectorAll("img")].map((img) => {
            const r = rect(img);
            const scale = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
            return { ...r, source: img.dataset.source, alt: img.alt, fit: getComputedStyle(img).objectFit,
                sourceWidth: img.naturalWidth, sourceHeight: img.naturalHeight,
                labelPx: Number(img.dataset.labelSize) * scale };
        });
        const figures = [...section.querySelectorAll("figure")].map((element) => ({ ...rect(element), caption: rect(element.querySelector("figcaption")), captionLines: lines(element.querySelector("figcaption")) }));
        const prose = [...section.querySelectorAll("p,h3")].filter((element) => !element.closest(".footnote,header,footer"));
        const clone = section.cloneNode(true);
        clone.querySelectorAll("style,script").forEach((node) => node.remove());
        return { text: text(clone), typography, heading: rect(section.querySelector("h2")), headingLines: lines(section.querySelector("h2")),
            media, figures, footnote: rect(section.querySelector(".footnote")),
            footnoteLines: section.querySelector(".footnote") ? lines(section.querySelector(".footnote")) : 0,
            evidence: rect(section.querySelector('[data-region="evidence"]')),
            interpretation: rect(section.querySelector('[data-region="interpretation"]')),
            contentBottom: Math.max(...figures.map((r) => r.bottom), ...prose.map((p) => rect(p).bottom)),
            stackGap: figures.length === 2 ? figures[1].top - figures[0].bottom : null,
            fontLoaded: document.fonts.check('26px "Noto Sans JP"', "条件比較"),
        };
    }));
    return metrics.map(({ text, typography, ...metric }, index) => {
        const findings = Object.fromEntries(["clipped", "overlaps", "crowded", "smallText"].map((key) => [key, audits[index][key]]));
        const problems = [];
        for (const [key, items] of Object.entries(findings)) if (items.length) problems.push(key);
        if (metric.contentBottom > 673) problems.push("body-reserve");
        if (metric.footnote && metric.contentBottom >= metric.footnote.top) problems.push("footnote-intrusion");
        if (metric.media.some((image) => image.labelPx < 12 - 0.01)) problems.push("image-label-below-12px");
        if (metric.media.some((image) => image.fit !== "contain" || image.height <= 0)) problems.push("media-fit");
        return { ...metric, textSha256: sha(text), typographySha256: sha(JSON.stringify(typography)),
            typography, findings, problems, fits: problems.length === 0 };
    });
}

function compareContent(item, original) {
    assert.equal(item.textSha256, original.textSha256, "Visible content changed");
    assert.equal(item.typographySha256, original.typographySha256, "Typography changed");
    assert(item.fontLoaded);
    assert.deepEqual(item.media.map(({ source, alt }) => ({ source, alt })), original.media.map(({ source, alt }) => ({ source, alt })));
    if (item.evidence) {
        for (const region of ["evidence", "interpretation"]) for (const key of ["left", "width"]) {
            assert(Math.abs(item[region][key] - original[region][key]) < 0.1, `${region} ${key} changed`);
        }
    }
    if (item.stackGap !== null) assert(Math.abs(item.stackGap - original.stackGap) < 0.1, `Stack gap changed: ${original.stackGap} -> ${item.stackGap}`);
}

async function boundaries(page) {
    return page.locator("section").evaluateAll((sections) => sections.map((section) => {
        const slide = section.getBoundingClientRect();
        const body = section.querySelector(":scope > .body");
        const note = section.querySelector(":scope > .footnote");
        const style = note && getComputedStyle(note);
        return {
            bodyBottom: body.getBoundingClientRect().bottom - slide.top,
            gap: parseFloat(getComputedStyle(body).rowGap),
            margin: getComputedStyle(body).marginBottom,
            noteStyle: style && ["position", "fontSize", "lineHeight", "bottom", "left", "right"].map((key) => style[key]),
            order: [...section.children].filter((el) => !["STYLE", "SCRIPT"].includes(el.tagName)).map((el) => el.className || el.tagName),
            page: section.dataset.marpitPagination,
        };
    }));
}
async function main() {
    const { values: args } = parseArgs({ options: { font: { type: "string" }, "svg-font": { type: "string" }, output: { type: "string" }, verify: { type: "boolean" } } });
    for (const file of manifest.files) assert.equal(sha(fs.readFileSync(path.join(prior, file.path))), file.sha256, file.path);
    if (args.verify) {
        const archive = require("./manifest.json");
        assert.equal(sha(fs.readFileSync(path.join(root, archive.priorManifest.path))), archive.priorManifest.sha256);
        for (const file of archive.files) assert.equal(sha(fs.readFileSync(path.join(__dirname, file.path))), file.sha256, file.path);
        for (const pin of archive.sources) readPin(pin);
        console.log("Verified phase 1 archive and phase 2 files/source blobs.");
        return;
    }
    assert(args.font && args["svg-font"] && args.output, "Pass --font TTF --svg-font WOFF2 --output EMPTY_DIRECTORY");
    if (fs.existsSync(path.join(__dirname, "manifest.json"))) {
        for (const pin of require("./manifest.json").sources) {
            assert.equal(sha(fs.readFileSync(path.join(root, pin.path))), pin.sha256, `Restore the recorded implementation before rerunning: ${pin.path}`);
        }
    }
    const font = fs.readFileSync(args.font), svgFont = fs.readFileSync(args["svg-font"]);
    assert.equal(sha(font), manifest.conditions.font.sha256);
    assert.equal(sha(svgFont), manifest.conditions.svgFont.sha256);
    const output = path.resolve(args.output);
    assert(!fs.existsSync(output) || fs.readdirSync(output).length === 0, "Never overwrite an existing run");
    fs.mkdirSync(path.join(output, "figures"), { recursive: true });
    const { front, cases } = recipe.inputs(readPin(manifest.sources.fixture).toString());
    const historical = JSON.parse(gunzipSync(fs.readFileSync(path.join(prior, "run/all-trials.json.gz"))));
    const { chromium } = require("playwright");
    const { createConfiguredMarp } = require(path.join(root, "src/slide-map"));
    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const result = { conditions: { ...manifest.conditions, node: process.versions.node, chromium: browser.version(),
        playwright: require("playwright/package.json").version, marpCore: require("@marp-team/marp-core/package.json").version,
        phase: "post-fix", baselineCommit: "c8dece4", implementationCommit: "62cfcab2a9a17b2c51669496548f68c59a00c8e8",
        cssComparison: "Identical body markup with pinned pre-fix theme CSS versus the recorded post-fix CSS and runtime.",
        repairs: "Default body only; no 56px override. Pre-fix CSS is paired with current engine; the new private reserve has no consumer in that CSS. All prior body-default metrics are independently matched." }, pairs: [], fontUse: [] };
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
        await page.route(/^https?:\/\//, (route) => route.abort());
        for (const theme of recipe.themes) {
            const markdown = front.replace("theme: lab", `theme: ${theme}`) + cases.map(recipe.body).join("\n---\n");
            const phases = {};
            for (const phase of ["before", "after"]) {
                const marp = createConfiguredMarp();
                marp.themeSet.add(phase === "before" ? readPin(manifest.sources.css[theme]).toString() : fs.readFileSync(path.join(root, `themes/${theme}.css`), "utf8"));
                const { html, css } = marp.render(withMedia(markdown, svgFont.toString("base64")));
                await page.setContent(`<style>body{margin:0}${css}@font-face{font-family:"Noto Sans JP";font-weight:100 900;src:url(data:font/ttf;base64,${font.toString("base64")});}</style>${html}`);
                await page.locator("img").evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
                await page.evaluate(async () => { await document.fonts.ready; await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
                phases[phase] = { metrics: await measure(page), boundaries: await boundaries(page) };
                const cdp = await page.context().newCDPSession(page);
                await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
                const { root: dom } = await cdp.send("DOM.getDocument");
                const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: dom.nodeId, selector: "h2" });
                const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
                assert(fonts.some((entry) => entry.isCustomFont && entry.familyName.includes("Noto Sans JP")));
                result.fontUse.push({ theme, phase, fonts }); await cdp.detach();
                for (const [i, item] of cases.entries()) {
                    if (item.family === "results-footnote-wrap" || (phase === "after" && item.family === "columns-portrait" && item.growth === "caption")) {
                        await page.locator("section").nth(i).screenshot({ path: path.join(output, "figures", `${theme}--${item.id}--${phase}.png`) });
                    }
                }
            }
            for (const [index, item] of cases.entries()) {
                const before = phases.before.metrics[index], after = phases.after.metrics[index];
                const old = historical.trials.find((row) => row.theme === theme && row.case === item.id && row.id === "body").metrics;
                assert.deepEqual(before, old, `${theme}/${item.id}: pre-fix replay differs from phase 1`);
                compareContent(after, before);
                assert.deepEqual(after.footnote, before.footnote);
                assert.equal(after.headingLines, before.headingLines);
                assert.deepEqual(after.figures.map((figure) => figure.captionLines), before.figures.map((figure) => figure.captionLines));
                const a = phases.after.boundaries[index], b = phases.before.boundaries[index];
                for (const key of ["noteStyle", "order", "page", "gap"]) assert.deepEqual(a[key], b[key]);
                if (after.footnote) assert(a.bodyBottom <= after.footnote.top - a.gap + 0.02);
                assert(after.fits, `${theme}/${item.id}: ${after.problems.join(", ")}`);
                if (a.bodyBottom === b.bodyBottom) assert.deepEqual(after, before);
                result.pairs.push({ theme, case: item.id, family: item.family, growth: item.growth, counts: recipe.counts(recipe.body(item)),
                    before: { ...before, ...b }, after: { ...after, ...a },
                    removedCaseSizeDeclarations: theme === "lab" && item.family === "results-footnote-wrap" ? 1 : 0 });
            }
        }
    } finally { await browser.close(); }
    fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify({ pairs: result.pairs.length, unchanged: result.pairs.filter((row) => row.before.bodyBottom === row.after.bodyBottom).length,
        removedDeclarations: result.pairs.reduce((n, row) => n + row.removedCaseSizeDeclarations, 0), savedPNGs: fs.readdirSync(path.join(output, "figures")).length }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
