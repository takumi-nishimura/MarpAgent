// Bounded extension of ../ISS-0047-body-layout/rerun.cjs. Historical evidence is read-only.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { parseArgs } = require("node:util");
const recipe = require("./recipes.cjs");
const root = path.resolve(__dirname, "../../..");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const manifest = require("./manifest.json");

function readPin(pin) {
    const local = path.join(root, pin.path);
    if (fs.existsSync(local)) {
        const bytes = fs.readFileSync(local);
        if (sha(bytes) === pin.sha256) return bytes;
    }
    const bytes = execFileSync("git", ["cat-file", "blob", pin.blob], { cwd: root });
    assert.equal(sha(bytes), pin.sha256, pin.path);
    return bytes;
}

const source = readPin(manifest.sources.fixture).toString();
const { front, cases } = recipe.inputs(source);
function documentSource(theme, slides) {
    return front.replace("theme: lab", `theme: ${theme}`) + slides.join("\n---\n");
}
function verify() {
    for (const pin of Object.values(manifest.sources).flatMap((value) => value.path ? [value] : Object.values(value))) readPin(pin);
    for (const theme of recipe.themes) {
        assert.equal(sha(documentSource(theme, cases.map((item) => item.markdown))), manifest.inputs[theme].legacy);
        assert.equal(sha(documentSource(theme, cases.map(recipe.body))), manifest.inputs[theme].body);
    }
    for (const file of manifest.files || []) assert.equal(sha(fs.readFileSync(path.join(__dirname, file.path))), file.sha256, file.path);
}

function withMedia(markdown, svgFont) {
    return markdown.replace(/src="assets\/img\/([^"<>]+)"/g, (_, name) => {
        const svg = readPin(manifest.sources.assets[name]).toString().replace(/(<svg\b[^>]*>)/,
            `$1<style>@font-face {font-family:"Noto Sans JP";font-weight:100 900;src:url(data:font/woff2;base64,${svgFont});}</style>`);
        const label = name.startsWith("stage") ? 28 : 24;
        return `data-source="${name}" data-label-size="${label}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"`;
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

const smallestLabel = (row) => Math.min(...row.metrics.media.map((image) => image.labelPx));
function best(rows) {
    return rows.filter((row) => row.metrics.fits).sort((a, b) => a.adjustments - b.adjustments || smallestLabel(b) - smallestLabel(a))[0] || null;
}

async function main() {
    const { values: args } = parseArgs({ options: {
        verify: { type: "boolean" }, font: { type: "string" }, "svg-font": { type: "string" }, output: { type: "string" },
    } });
    verify();
    if (args.verify) { console.log("Verified pinned inputs, recipes, and archived files."); return; }
    assert(args.font && args["svg-font"] && args.output, "Pass --font TTF --svg-font WOFF2 --output EMPTY_DIRECTORY");
    const font = fs.readFileSync(args.font);
    const svgFont = fs.readFileSync(args["svg-font"]);
    assert.equal(sha(font), manifest.conditions.font.sha256);
    assert.equal(sha(svgFont), manifest.conditions.svgFont.sha256);
    const output = path.resolve(args.output);
    assert(!fs.existsSync(output) || fs.readdirSync(output).length === 0, "Never overwrite a previous run");
    fs.mkdirSync(path.join(output, "figures"), { recursive: true });
    fs.mkdirSync(path.join(output, "inputs"), { recursive: true });
    const { chromium } = require(path.join(root, "node_modules/playwright"));
    const { createConfiguredMarp } = require(path.join(root, "src/slide-map"));
    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const result = { conditions: { ...manifest.conditions, node: process.versions.node, chromium: browser.version(),
        marpCore: require(path.join(root, "node_modules/@marp-team/marp-core/package.json")).version,
        playwright: require(path.join(root, "node_modules/playwright/package.json")).version }, fontUse: [], trials: [], comparisons: [] };
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
        await page.route(/^https?:\/\//, (route) => route.abort());
        for (const theme of recipe.themes) {
            const marp = createConfiguredMarp();
            marp.themeSet.add(readPin(manifest.sources.css[theme]).toString());
            const trials = cases.flatMap((item) => [
                ...recipe.candidates(item).map((candidate) => ({ ...candidate, case: item.id, method: "legacy" })),
                { id: "body", case: item.id, method: "body", choices: [], adjustments: 0, markdown: recipe.body(item) },
                ...(theme === "lab" && item.family === "results-footnote-wrap" ? [{
                    id: "body-reserve-56", case: item.id, method: "body", choices: ["--body-bottom-safe:56px"], adjustments: 1,
                    markdown: recipe.body(item).replace('<div class="body">', '<div class="body" style="--body-bottom-safe: 56px">'),
                }] : []),
            ]);
            const rendered = marp.render(withMedia(documentSource(theme, trials.map((trial) => trial.markdown)), svgFont.toString("base64")));
            await page.setContent(`<style>body{margin:0}${rendered.css}@font-face{font-family:"Noto Sans JP";font-weight:100 900;src:url(data:font/ttf;base64,${font.toString("base64")});}</style>${rendered.html}`);
            await page.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
            await page.evaluate(() => document.fonts.ready);
            const metrics = await measure(page);
            const cdp = await page.context().newCDPSession(page);
            await cdp.send("DOM.enable");
            await cdp.send("CSS.enable");
            const { root: dom } = await cdp.send("DOM.getDocument");
            for (const selector of ["h2", "figcaption"]) {
                const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: dom.nodeId, selector });
                const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
                assert(fonts.some((entry) => entry.isCustomFont && entry.familyName.includes("Noto Sans JP")));
                result.fontUse.push({ theme, selector, fonts });
            }
            await cdp.detach();
            const measured = trials.map(({ markdown, ...trial }, index) => ({ ...trial, theme, counts: recipe.counts(markdown), inputSha256: sha(markdown), metrics: metrics[index], index }));
            result.trials.push(...measured);
            for (const item of cases) {
                const rows = measured.filter((trial) => trial.case === item.id);
                for (const row of rows) compareContent(row.metrics, rows[0].metrics);
                const legacy = best(rows.filter((row) => row.method === "legacy" && row.adjustmentType === "utility"));
                const bodyDefault = rows.find((row) => row.id === "body");
                const body = best(rows.filter((row) => row.method === "body")) || bodyDefault;
                const comparison = { theme, case: item.id, family: item.family, growth: item.growth,
                    legacy: legacy ? { candidate: legacy.id, counts: legacy.counts, labelPx: smallestLabel(legacy), fits: true } : null,
                    bodyDefault: { fits: bodyDefault.metrics.fits, problems: bodyDefault.metrics.problems },
                    body: { candidate: body.id, counts: body.counts, labelPx: smallestLabel(body), fits: body.metrics.fits, problems: body.metrics.problems } };
                result.comparisons.push(comparison);
                for (const [method, selected] of [["legacy", legacy], ["body", body]]) {
                    if (!selected) continue;
                    const file = `${theme}--${item.id}--${method}.png`;
                    await page.locator("section").nth(selected.index).screenshot({ path: path.join(output, "figures", file) });
                }
            }
            for (const comparison of result.comparisons.filter((row) => row.theme === theme)) {
                const baseline = result.comparisons.find((row) => row.theme === theme && row.family === comparison.family && row.growth === "base");
                const inherited = measured.find((row) => row.case === comparison.case && row.id === baseline.legacy?.candidate);
                for (const method of ["legacy", "body"]) {
                    const selected = measured.find((row) => row.case === comparison.case && row.id === comparison[method]?.candidate);
                    const base = measured.find((row) => row.case === baseline.case && row.id === baseline[method]?.candidate);
                    assert(selected && base, `No fitting ${method}: ${comparison.case}`);
                    if (comparison.growth === "heading") assert.equal(selected.metrics.headingLines, base.metrics.headingLines + 1, `${theme}/${comparison.case}/${method}: heading did not grow by one line`);
                    if (comparison.growth === "caption") assert.equal(selected.metrics.figures.at(-1).captionLines, base.metrics.figures.at(-1).captionLines + 1, `${theme}/${comparison.case}/${method}: caption did not grow by one line`);
                }
                comparison.inheritedLegacy = inherited ? { candidate: inherited.id, fits: inherited.metrics.fits, problems: inherited.metrics.problems } : null;
                comparison.requiredLegacyUtilityReadjustments = inherited?.metrics.fits ? 0 : comparison.legacy ? comparison.legacy.candidate.split("+").filter((choice, i) => choice !== baseline.legacy.candidate.split("+")[i]).length : null;
                comparison.requiredBodyReadjustments = comparison.body.candidate === baseline.body.candidate ? 0 : 1;
                const familyRows = measured.filter((row) => row.method === "legacy" && row.case.startsWith(comparison.family + "--"));
                const robustRows = familyRows.filter((row) => row.case.endsWith("--base") && familyRows.filter((peer) => peer.id === row.id).every((peer) => peer.metrics.fits));
                const robust = best(robustRows.filter((row) => row.adjustmentType === "utility"));
                comparison.robustLegacyCandidate = robust?.id || null;
                comparison.robustHeightAlternative = best(robustRows.filter((row) => row.adjustmentType === "inline-height"))?.id || null;
            }
            for (const method of ["legacy", "body"]) {
                const slides = cases.map((item) => {
                    const chosen = result.comparisons.find((row) => row.theme === theme && row.case === item.id)[method];
                    return chosen ? trials.find((trial) => trial.case === item.id && trial.id === chosen.candidate).markdown : item.markdown;
                });
                fs.writeFileSync(path.join(output, "inputs", `${theme}-${method}.md`), documentSource(theme, slides));
            }
            console.log(`${theme}: ${measured.length} trials; ${result.comparisons.filter((row) => row.theme === theme && row.legacy && row.body.fits).length}/${cases.length} pairs fit`);
        }
    } finally {
        writeJSON(path.join(output, "result.json"), result);
        await browser.close();
    }
}
main().catch((error) => { console.error(error.stack); process.exitCode = 1; });
