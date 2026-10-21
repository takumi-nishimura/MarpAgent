// Reproduce the default-lab comparison with separate, matching 400/700 fonts.
// Run under the shared browser lock with FONTCONFIG_FILE set for SVG text too.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { gunzipSync } = require("node:zlib");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../../..");
const { chromium } = require(path.join(root, "node_modules/playwright"));
const config = require(path.join(root, "marp.config"));
const { copyDeckForRender } = require(path.join(root, "src/media-assets"));
const { auditSlidesInPage, auditMediaInPage, auditRenderErrorsInPage } = require(path.join(root, "src/visual-overflow"));
const [fontArgument, outputArgument] = process.argv.slice(2);
if (!fontArgument || !outputArgument || !process.env.FONTCONFIG_FILE) {
    console.error("Usage: FONTCONFIG_FILE=<fonts.conf> node compare.cjs <font-directory> <new-output-directory>");
    process.exit(2);
}
const fontDir = path.resolve(fontArgument);
const output = path.resolve(outputArgument);
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const recordedPath = path.join(__dirname, "summary.json");
const recorded = fs.existsSync(recordedPath) ? JSON.parse(fs.readFileSync(recordedPath)) : null;
const inputs = ["fixtures/body-layout-slide.md", "fixtures/lab-typography-slide.md", "fixtures/layout-baselines/slide.md", "decks/example/slide.md"];
const retained = [
    { id: "body-caption", input: inputs[0], slide: 2 },
    { id: "emphasis", input: inputs[1], slide: 2 },
];
const styles = Object.fromEntries(["before", "after"].map((name) => [name, gunzipSync(fs.readFileSync(path.join(__dirname, `styles/${name}.css.gz`)))]));
const fonts = [400, 700].map((weight) => {
    const file = `NotoSansJP-${weight}.ttf`;
    return { weight, file, sha256: digest(fs.readFileSync(path.join(fontDir, file))) };
});
if (recorded) {
    for (const font of fonts) {
        if (font.sha256 !== recorded.fonts.find((entry) => entry.weight === font.weight)?.sha256) throw new Error(`Font hash changed: ${font.file}`);
    }
    for (const input of recorded.inputs) {
        if (digest(fs.readFileSync(path.join(root, input.path))) !== input.sha256) throw new Error(`Source changed: ${input.path}; use the evidence revision`);
    }
    for (const name of ["before", "after"]) {
        if (digest(styles[name]) !== recorded.styles[name].sha256) throw new Error(`${name} CSS hash changed`);
    }
}

(async () => {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.mkdirSync(output);
    const browser = await chromium.launch({ headless: true, env: process.env });
    const report = {
        schemaVersion: 1,
        beforeRevision: "1f303a57c1a3dc4d013db7ce4a17e4361eb676fe",
        implementationRevision: "9bd58e17696055c208e5d312ba1b0ff3f5ce20a1",
        checkout: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
        environment: {
            os: `${os.type()} ${os.release()} ${os.arch()}`, node: process.version,
            browser: browser.version(), viewport: { width: 1280, height: 720 }, dpr: 1,
            fontconfigSha256: digest(fs.readFileSync(process.env.FONTCONFIG_FILE)),
            remoteFonts: "blocked; matching local 400/700 faces registered explicitly",
            versions: Object.fromEntries(["@marp-team/marp-core", "@marp-team/marp-cli", "playwright"].map((name) => [name, JSON.parse(fs.readFileSync(path.join(root, "node_modules", name, "package.json"))).version])),
        },
        fonts,
        styles: Object.fromEntries(Object.entries(styles).map(([name, css]) => [name, { file: `styles/${name}.css.gz`, sha256: digest(css), bytes: css.length }])),
        auditOptions: { tolerancePx: 2, overlapTolerancePx: 2, mediaToleranceRatio: 0.02, safeMarginPx: 20, referenceWidthPx: 1280, referenceHeightPx: 720, bodyFloorPx: 12, secondaryFloorPx: 8 },
        inputs: [], comparisons: [], pairs: [],
    };
    try {
        for (const input of inputs) {
            const markdown = fs.readFileSync(path.join(root, input), "utf8");
            const stem = input.replaceAll("/", "__").replace(/\.md$/, "");
            const sourceDir = path.join(output, stem, "source");
            fs.mkdirSync(path.dirname(sourceDir), { recursive: true });
            copyDeckForRender(path.join(root, input), sourceDir);
            const captures = {};
            // Reverse the initial run's order to check for render-state leakage.
            for (const variant of ["formerOptIn", "after", "before"]) {
                const marp = config.engine({});
                marp.themeSet.add((variant === "after" ? styles.after : styles.before).toString("utf8"));
                const { html, css } = marp.render(markdown);
                const fontCss = fonts.map(({ weight, file }) => `@font-face { font-family: 'Noto Sans JP'; src: url('${pathToFileURL(path.join(fontDir, file)).href}'); font-weight: ${weight}; font-style: normal; }`).join("\n");
                const htmlPath = path.join(output, stem, `${variant}.html`);
                fs.writeFileSync(htmlPath, `<meta charset="utf-8"><base href="${pathToFileURL(sourceDir + path.sep).href}"><style>body { margin: 0; } ${css}\n${fontCss}\nsvg[data-marpit-svg] { display: block; width: 1280px; height: 720px; }</style>${html}`);
                const page = await browser.newPage({ viewport: report.environment.viewport });
                await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
                await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
                await page.evaluate(async (variant) => {
                    // The old class is used only with the historical stylesheet.
                    for (const section of document.querySelectorAll("section")) section.classList.toggle("lab-refined", variant === "formerOptIn");
                    for (const weight of [400, 700]) await document.fonts.load(`${weight} 26px "Noto Sans JP"`, "日本語");
                    await document.fonts.ready;
                    await Promise.all([...document.querySelectorAll("img")].map((img) => img.decode()));
                    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                }, variant);
                const slides = await page.locator("section").evaluateAll((sections) => sections.map((section, index) => {
                    const rect = (element) => {
                        const { left, top, width, height } = element.getBoundingClientRect();
                        return { left, top, width, height };
                    };
                    const style = (element) => {
                        const value = getComputedStyle(element);
                        return { size: value.fontSize, weight: value.fontWeight, leading: value.lineHeight, color: value.color };
                    };
                    const blocks = [...section.querySelectorAll("h1,h2,h3,p,li,figcaption,th,td,.footnote,header,footer")].map((element) => {
                        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                        const tops = new Set();
                        for (let node; (node = walker.nextNode());) {
                            if (!node.textContent.trim()) continue;
                            const range = document.createRange();
                            range.selectNodeContents(node);
                            for (const box of range.getClientRects()) if (box.width > 0) tops.add(Math.round(box.top));
                        }
                        return { tag: element.tagName, text: element.textContent, lines: tops.size, rect: rect(element), style: style(element) };
                    });
                    return {
                        index: index + 1, text: section.textContent, classes: section.className,
                        body: style(section), blocks,
                        pagination: { page: section.getAttribute("data-marpit-pagination"), total: section.getAttribute("data-marpit-pagination-total"), content: getComputedStyle(section, "::after").content },
                        emphasis: [...section.querySelectorAll("strong,em,.marker,mark")].map((element) => ({ tag: element.tagName, text: element.textContent, style: style(element), rect: rect(element) })),
                        media: [...section.querySelectorAll("img,video,figure > svg")].map((element) => ({ tag: element.tagName, source: element.getAttribute("src"), rect: rect(element), fit: getComputedStyle(element).objectFit, position: getComputedStyle(element).objectPosition })),
                        groups: [...section.querySelectorAll(".body,.col,[data-region='columns'],figure")].map((element) => ({ tag: element.tagName, classes: element.className, rect: rect(element) })),
                    };
                }));
                const audits = await page.evaluate(auditSlidesInPage, report.auditOptions);
                const mediaAudit = await page.evaluate(auditMediaInPage, { timeoutMs: 15000 });
                const renderErrors = await page.evaluate(auditRenderErrorsInPage);
                const cdp = await page.context().newCDPSession(page);
                await cdp.send("DOM.enable");
                await cdp.send("CSS.enable");
                const { root: dom } = await cdp.send("DOM.getDocument", { depth: 0 });
                const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: dom.nodeId, selector: "section" });
                for (const pair of retained.filter((pair) => pair.input === input)) {
                    const slide = slides[pair.slide - 1];
                    const png = await page.locator("section").nth(pair.slide - 1).screenshot();
                    slide.pngSha256 = digest(png);
                    slide.fontUsage = {};
                    for (const selector of ["p", "strong", "figcaption"]) {
                        const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: nodeIds[pair.slide - 1], selector });
                        if (nodeId) slide.fontUsage[selector] = (await cdp.send("CSS.getPlatformFontsForNode", { nodeId })).fonts;
                    }
                    if (variant !== "formerOptIn") {
                        slide.image = `${pair.id}-${variant}.png`;
                        fs.writeFileSync(path.join(output, slide.image), png);
                    }
                }
                captures[variant] = { slides, audits, mediaAudit, renderErrors };
                await page.close();
            }
            report.inputs.push({ path: input, sha256: digest(markdown), pages: captures.after.slides.length });
            for (let index = 0; index < captures.after.slides.length; index++) {
                const before = captures.before.slides[index];
                const after = captures.after.slides[index];
                report.comparisons.push({
                    input, slide: index + 1, textEqual: before.text === after.text,
                    paginationEqual: JSON.stringify(before.pagination) === JSON.stringify(after.pagination),
                    wraps: before.blocks.flatMap((block, i) => block.lines === after.blocks[i]?.lines ? [] : [{ tag: block.tag, text: block.text, before: block.lines, after: after.blocks[i]?.lines }]),
                    audits: Object.fromEntries(Object.entries(captures).map(([name, capture]) => {
                        const audit = capture.audits[index];
                        return [name, { clipped: audit.clipped, maxOverflowPx: audit.maxOverflowPx, overlaps: audit.overlaps, smallText: audit.smallText }];
                    })),
                });
            }
            for (const pair of retained.filter((pair) => pair.input === input)) {
                const pick = (variant) => {
                    const slide = captures[variant].slides[pair.slide - 1];
                    return { image: slide.image, pngSha256: slide.pngSha256, pagination: slide.pagination, body: slide.body, captions: slide.blocks.filter((block) => block.tag === "FIGCAPTION"), emphasis: slide.emphasis, media: slide.media, groups: slide.groups, fontUsage: slide.fontUsage };
                };
                report.pairs.push({ ...pair, before: pick("before"), after: pick("after"), formerOptInPngSha256: captures.formerOptIn.slides[pair.slide - 1].pngSha256, matchesFormerOptIn: captures.after.slides[pair.slide - 1].pngSha256 === captures.formerOptIn.slides[pair.slide - 1].pngSha256 });
            }
            report.inputs.at(-1).mediaAudit = Object.fromEntries(Object.entries(captures).map(([name, capture]) => [name, capture.mediaAudit]));
            report.inputs.at(-1).renderErrors = Object.fromEntries(Object.entries(captures).map(([name, capture]) => [name, capture.renderErrors]));
        }
    } finally {
        await browser.close();
    }
    fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ compared: report.comparisons.length, textEqual: report.comparisons.filter((entry) => entry.textEqual).length, wraps: report.comparisons.filter((entry) => entry.wraps.length), pairsMatchFormerOptIn: report.pairs.map((pair) => [pair.id, pair.matchesFormerOptIn]) }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
