const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { gunzipSync } = require("node:zlib");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
// Archived rendering/audit harness with session paths replaced by arguments.
// The archive itself was extracted from existing results, not rendered again.
const root = path.resolve(__dirname, "../../..");
const saved = require("./summary.json");
const [fontArgument, outputArgument] = process.argv.slice(2);
if (!fontArgument || !outputArgument) {
    console.error("Usage: node compare.cjs <NotoSansJP.ttf> <new-output-directory>");
    process.exit(2);
}
const { chromium } = require(path.join(root, "node_modules/playwright"));
const config = require(path.join(root, "marp.config"));
const { copyDeckForRender } = require(path.join(root, "src/media-assets"));
const { auditSlidesInPage, auditMediaInPage, auditRenderErrorsInPage } = require(path.join(root, "src/visual-overflow"));
const output = path.resolve(outputArgument);
const fontPath = path.resolve(fontArgument);
const inputs = saved.inputs.map(({ path: file, slides }) => [file, slides]);
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const styles = Object.fromEntries(Object.entries(saved.styles).map(([name, entry]) => {
    const bytes = gunzipSync(fs.readFileSync(path.join(__dirname, entry.file)));
    if (digest(bytes) !== entry.cssSha256) throw new Error(`${name} CSS hash differs from the archive`);
    return [name, bytes];
}));

(async () => {
    if (digest(fs.readFileSync(fontPath)) !== saved.font.sha256) throw new Error("Font hash differs from the recorded comparison");
    for (const input of saved.inputs) {
        if (digest(fs.readFileSync(path.join(root, input.path))) !== input.sha256) throw new Error(`Fixture hash differs from the recorded comparison: ${input.path}`);
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.mkdirSync(output);
    const fontDir = path.join(output, "fonts");
    fs.mkdirSync(fontDir);
    fs.mkdirSync(path.join(fontDir, "cache"));
    const localFontPath = path.join(fontDir, "NotoSansJP.ttf");
    fs.copyFileSync(fontPath, localFontPath);
    const fontConfig = path.join(fontDir, "fonts.conf");
    fs.writeFileSync(fontConfig, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${fontDir}</dir><dir>/usr/share/fonts</dir><cachedir>${path.join(fontDir, "cache")}</cachedir><alias><family>sans-serif</family><prefer><family>Noto Sans JP</family></prefer></alias></fontconfig>`);
    const env = { ...process.env, FONTCONFIG_FILE: fontConfig };
    const browser = await chromium.launch({ headless: true, env });
    fs.copyFileSync(__filename, path.join(output, "compare.cjs"));
    fs.writeFileSync(path.join(output, "before.css"), styles.before);
    fs.writeFileSync(path.join(output, "after.css"), styles.after);
    const report = {
        browser: browser.version(),
        environment: { os: `${os.type()} ${os.release()} ${os.arch()}`, node: process.version, viewport: { width: 1280, height: 720 }, dpr: 1, fontConfig: "<run-dir>/fonts/fonts.conf", nativeJapaneseMatch: execFileSync("fc-match", ["-f", "%{family}: %{file}", "sans-serif:lang=ja"], { env, encoding: "utf8" }).replaceAll(output, "<run-dir>"), versions: Object.fromEntries(["@marp-team/marp-core", "@marp-team/marp-cli", "playwright"].map((name) => [name, JSON.parse(fs.readFileSync(path.join(root, "node_modules", name, "package.json"))).version])) },
        font: { path: "<provided-font>", sha256: digest(fs.readFileSync(fontPath)), weights: [400, 700] },
        baseline: saved.styles.before.provenance,
        candidate: saved.styles.after.provenance,
        replayCheckout: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
        samples: [],
    };
    try {
        for (const [input, slides] of inputs) {
            const markdown = fs.readFileSync(path.join(root, input), "utf8");
            const sourceDir = path.join(output, input.replaceAll("/", "__").replace(/\.md$/, ""), "source");
            fs.mkdirSync(path.dirname(sourceDir), { recursive: true });
            copyDeckForRender(path.join(root, input), sourceDir);
            const sample = { input, sourceSha256: digest(markdown), captures: [] };
            for (const fontMode of ["noto"]) {
                for (const variant of ["legacy", "compatible", "refined"]) {
                    const marp = config.engine({});
                    marp.themeSet.add((variant === "legacy" ? styles.before : styles.after).toString("utf8"));
                    const { html, css } = marp.render(markdown);
                    const dir = path.join(output, input.replaceAll("/", "__").replace(/\.md$/, ""), fontMode);
                    fs.mkdirSync(dir, { recursive: true });
                    const htmlPath = path.join(dir, `${variant}.html`);
                    const font = fontMode === "noto" ? [400, 700].map((weight) =>
                        `@font-face { font-family: 'Noto Sans JP'; src: url('${pathToFileURL(localFontPath).href}'); font-weight: ${weight}; font-style: normal; }`,
                    ).join("\n") : "";
                    fs.writeFileSync(htmlPath,
                        `<meta charset="utf-8"><base href="${pathToFileURL(sourceDir + path.sep).href}"><style>body { margin: 0; } ${css}\n${font}\nsvg[data-marpit-svg] { display: block; width: 1280px; height: 720px; }</style>${html}`,
                    );
                    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
                    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
                    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
                    await page.evaluate(async ({ variant, fontMode }) => {
                        for (const section of document.querySelectorAll("section")) {
                            section.classList.toggle("lab-refined", variant === "refined");
                        }
                        if (fontMode === "noto") {
                            await document.fonts.load('400 26px "Noto Sans JP"', "日本語");
                            await document.fonts.load('700 26px "Noto Sans JP"', "日本語");
                        }
                        await document.fonts.ready;
                        await Promise.all([...document.querySelectorAll("img")].map((img) => img.decode()));
                        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    }, { variant, fontMode });
                    const cdp = await page.context().newCDPSession(page);
                    await cdp.send("DOM.enable");
                    await cdp.send("CSS.enable");
                    const { root: dom } = await cdp.send("DOM.getDocument", { depth: 0 });
                    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: dom.nodeId, selector: "section" });
                    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
                    const measured = await page.evaluate((indices) => {
                        const rect = (element) => {
                            const value = element.getBoundingClientRect();
                            return { left: value.left, top: value.top, width: value.width, height: value.height };
                        };
                        const style = (element) => {
                            const value = getComputedStyle(element);
                            return { size: value.fontSize, weight: value.fontWeight, leading: value.lineHeight, family: value.fontFamily, color: value.color };
                        };
                        return [...document.querySelectorAll("section")].filter((_, i) => indices.includes(i + 1)).map((section) => ({
                            index: [...document.querySelectorAll("section")].indexOf(section) + 1,
                            canvas: rect(section),
                            body: style(section),
                            text: section.textContent,
                            blocks: [...section.querySelectorAll("h1,h2,h3,p,li,figcaption,th,td,.footnote,header,footer")].map((element) => {
                                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                                const tops = new Set();
                                for (let node; (node = walker.nextNode());) {
                                    if (!node.textContent.trim()) continue;
                                    const range = document.createRange();
                                    range.selectNodeContents(node);
                                    for (const box of range.getClientRects()) {
                                        if (box.width > 0) tops.add(Math.round(box.top));
                                    }
                                }
                                return { tag: element.tagName, text: element.textContent, lines: tops.size, rect: rect(element), style: style(element) };
                            }),
                            groups: [...section.querySelectorAll(".body,.col,[data-region='columns'],figure")].map((element) => ({ tag: element.tagName, classes: element.className, rect: rect(element), children: [...element.children].map((child) => ({ tag: child.tagName, rect: rect(child) })) })),
                            media: [...section.querySelectorAll("img,video,figure > svg")].map((element) => ({ tag: element.tagName, source: element.getAttribute("src"), rect: rect(element), fit: getComputedStyle(element).objectFit, position: getComputedStyle(element).objectPosition })),
                            emphasis: [...section.querySelectorAll("strong,em,.marker,mark")].map((element) => ({ tag: element.tagName, text: element.textContent, style: style(element), rect: rect(element) })),
                        }));
                    }, slides);
                    const audit = await page.evaluate(auditSlidesInPage, { tolerancePx: 2, overlapTolerancePx: 2, mediaToleranceRatio: 0.02, safeMarginPx: 20, referenceWidthPx: 1280, referenceHeightPx: 720, bodyFloorPx: 12, secondaryFloorPx: 8 });
                    const mediaAudit = await page.evaluate(auditMediaInPage, { timeoutMs: 15000 });
                    const renderErrors = await page.evaluate(auditRenderErrorsInPage);
                    for (const slide of measured) {
                        const pngPath = path.join(dir, `${variant}-${slide.index}.png`);
                        await page.locator("section").nth(slide.index - 1).screenshot({ path: pngPath });
                        slide.screenshot = path.relative(output, pngPath);
                        slide.pngSha256 = digest(fs.readFileSync(pngPath));
                    }
                    sample.captures.push({ fontMode, variant, fonts, audit, mediaAudit, renderErrors, slides: measured });
                    await page.close();
                }
            }
            report.samples.push(sample);
        }
    } finally {
        await browser.close();
    }
    const comparisons = [];
    for (const sample of report.samples) {
        for (const fontMode of ["noto"]) {
            const find = (variant) => sample.captures.find((capture) => capture.fontMode === fontMode && capture.variant === variant);
            const legacy = find("legacy");
            const compatible = find("compatible");
            const refined = find("refined");
            for (let i = 0; i < legacy.slides.length; i++) {
                const before = legacy.slides[i];
                const after = refined.slides[i];
                comparisons.push({
                    input: sample.input, fontMode, slide: before.index,
                    compatiblePixelsEqual: before.pngSha256 === compatible.slides[i].pngSha256,
                    sourceTextEqual: before.text === after.text,
                    wraps: before.blocks.flatMap((block, j) => block.lines === after.blocks[j]?.lines ? [] : [{ tag: block.tag, text: block.text, before: block.lines, after: after.blocks[j]?.lines }]),
                });
            }
        }
    }
    report.comparisons = comparisons;
    fs.writeFileSync(path.join(output, "comparison.json"), JSON.stringify(report, null, 2) + "\n");
    const rows = report.samples.flatMap((sample) => sample.captures.filter((capture) => capture.fontMode === "noto" && capture.variant === "legacy").flatMap((capture) => capture.slides.map((slide) => {
        const after = sample.captures.find((entry) => entry.fontMode === "noto" && entry.variant === "refined").slides.find((entry) => entry.index === slide.index);
        return `<h2>${sample.input} · ${slide.index}</h2><div><img src="${slide.screenshot}"><img src="${after.screenshot}"></div>`;
    })));
    fs.writeFileSync(path.join(output, "review.html"), `<meta charset="utf-8"><title>Lab visual comparison</title><style>body{font:16px sans-serif;margin:24px}div{display:flex;gap:16px}img{width:48%;border:1px solid #aaa}</style><h1>Legacy / lab-refined · same source · Noto Sans JP 400/700</h1>${rows.join("\n")}`);
    process.stdout.write(JSON.stringify({ output, comparisons }, null, 2) + "\n");
})().catch((error) => { console.error(error); process.exitCode = 1; });
