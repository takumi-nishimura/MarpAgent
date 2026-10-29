const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { gunzipSync } = require("node:zlib");
const root = path.resolve(__dirname, "../../..");
const { chromium } = require(path.join(root, "node_modules/playwright"));
const config = require(path.join(root, "marp.config"));
const postcss = require(path.join(root, "node_modules/postcss"));
const [label, fontArgument, outputArgument] = process.argv.slice(2);
if (!["before", "after"].includes(label) || !fontArgument || !outputArgument) {
    throw new Error(
        "Usage: node capture.cjs <before|after> <font-directory> <output-directory>",
    );
}
const output = path.resolve(outputArgument);
const digest = (bytes) =>
    crypto.createHash("sha256").update(bytes).digest("hex");
const input = "fixtures/lab-emphasis-slide.md";
const source = fs.readFileSync(path.join(root, input), "utf8");
const theme = gunzipSync(
    fs.readFileSync(path.join(__dirname, `styles/${label}.css.gz`)),
).toString();
const fonts = [400, 700].map((weight) => {
    const file = `NotoSansJP-${weight}.ttf`;
    const bytes = fs.readFileSync(path.join(fontArgument, file));
    return {
        weight,
        file,
        sha256: digest(bytes),
        data: bytes.toString("base64"),
    };
});
const fontCss = fonts
    .map(
        (font) =>
            `@font-face{font-family:'Noto Sans JP';font-weight:${font.weight};src:url(data:font/ttf;base64,${font.data}) format('truetype');}`,
    )
    .join("\n");
(async () => {
    fs.mkdirSync(output, { recursive: true });
    const marp = config.engine({});
    marp.themeSet.add(theme);
    const { html, css } = marp.render(source);
    const localCss = postcss.parse(css);
    localCss.walkAtRules("import", (rule) => rule.remove());
    const htmlOutput = `<meta charset="utf-8"><title>Lab text roles: ${label}</title><style>body{margin:0}${localCss.toString()}${fontCss}svg[data-marpit-svg]{display:block;width:100vw;height:auto}</style>${html}`;
    fs.writeFileSync(path.join(output, `${label}.html`), htmlOutput);
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({
            viewport: { width: 1280, height: 720 },
        });
        await page.route(
            /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            (route) => route.abort(),
        );
        await page.setContent(htmlOutput);
        await page.evaluate(async () => {
            for (const weight of [400, 700])
                await document.fonts.load(
                    `${weight} 26px 'Noto Sans JP'`,
                    "日本語",
                );
            await document.fonts.ready;
        });
        const slides = await page.locator("section").evaluateAll((sections) =>
            sections.map((section) => {
                const origin = section.getBoundingClientRect();
                const items = [
                    ...section.querySelectorAll("em,strong,mark"),
                ].map((element) => {
                    const style = getComputedStyle(element);
                    const stops = [
                        ...style.backgroundImage.matchAll(/\s(\d+)%/g),
                    ].map((match) => Number(match[1]));
                    const start = stops.length ? stops[0] / 100 : 0;
                    const end = stops.length >= 4 ? stops.at(-1) / 100 : 1;
                    const boxes = [...element.getClientRects()].map((rect) => ({
                        x: rect.x - origin.x,
                        y: rect.y - origin.y,
                        width: rect.width,
                        height: rect.height,
                    }));
                    const bands = boxes.map((box) => ({
                        top: box.y + box.height * start,
                        bottom: box.y + box.height * end,
                        height: box.height * (end - start),
                    }));
                    const gaps = bands
                        .slice(1)
                        .map((band, index) => band.top - bands[index].bottom);
                    return {
                        tag: element.tagName,
                        text: element.textContent,
                        weight: style.fontWeight,
                        color: style.color,
                        background: style.backgroundImage,
                        fill: style.backgroundColor,
                        padding: style.padding,
                        decoration: style.boxDecorationBreak,
                        boxes,
                        bands,
                        gaps,
                    };
                });
                return {
                    text: section.textContent,
                    class: section.className,
                    pagination: [
                        section.getAttribute("data-marpit-pagination"),
                        section.getAttribute("data-marpit-pagination-total"),
                    ],
                    items,
                };
            }),
        );
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("DOM.enable");
        await cdp.send("CSS.enable");
        const { root: documentNode } = await cdp.send("DOM.getDocument");
        const fontUsage = {};
        for (const selector of ["em", "strong", "mark"]) {
            const { nodeId } = await cdp.send("DOM.querySelector", {
                nodeId: documentNode.nodeId,
                selector,
            });
            fontUsage[selector] = (
                await cdp.send("CSS.getPlatformFontsForNode", { nodeId })
            ).fonts;
        }
        const images = [];
        for (const [index, surface] of [
            [0, "light"],
            [1, "dark"],
        ]) {
            const file = `${label}-${surface}.png`;
            const bytes = await page.locator("section").nth(index).screenshot();
            fs.writeFileSync(path.join(output, file), bytes);
            images.push({ file, sha256: digest(bytes), bytes: bytes.length });
        }
        const report = {
            label,
            input: { file: input, sha256: digest(source) },
            css: { file: `styles/${label}.css.gz`, sha256: digest(theme) },
            fonts: fonts.map(({ data, ...font }) => font),
            fontUsage,
            environment: {
                node: process.version,
                platform: process.platform,
                architecture: process.arch,
                chromium: browser.version(),
                playwright: require(
                    path.join(root, "node_modules/playwright/package.json"),
                ).version,
                viewport: [1280, 720],
                deviceScaleFactor: 1,
            },
            slides,
            images,
        };
        fs.writeFileSync(
            path.join(output, `${label}.json`),
            JSON.stringify(report, null, 2) + "\n",
        );
        console.log(
            JSON.stringify({
                label,
                images: images.map((image) => image.file),
                fontUsage,
                multilineMarks: slides.map((slide) =>
                    slide.items
                        .filter((item) => item.tag === "MARK")
                        .map((item) => ({
                            lines: item.boxes.length,
                            gaps: item.gaps,
                        })),
                ),
            }),
        );
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
