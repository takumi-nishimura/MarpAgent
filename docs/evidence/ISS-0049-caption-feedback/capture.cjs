const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { gunzipSync } = require("node:zlib");
const root = path.resolve(__dirname, "../../..");
const { chromium } = require(path.join(root, "node_modules/playwright"));
const config = require(path.join(root, "marp.config"));
const [fontArgument, outputArgument] = process.argv.slice(2);
if (!fontArgument || !outputArgument)
    throw new Error(
        "Usage: node capture.cjs <font-directory> <new-output-directory>",
    );
const output = path.resolve(outputArgument);
const digest = (bytes) =>
    crypto.createHash("sha256").update(bytes).digest("hex");
const english =
    "The caption stays with the evidence when it wraps to a second line with further necessary qualifications";
const japanese =
    "図1．同じ測定条件で比較した結果を示す．参加者や装置が異なる条件へ一般化できることは示していない．";
const input = "fixtures/body-layout-slide.md";
const source = fs.readFileSync(path.join(root, input), "utf8");
const artwork = fs.readFileSync(
    path.join(root, "fixtures/body-layout-media.svg"),
);
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
const styles = {
    before: "../ISS-0049-marker-feedback/styles/before.css.gz",
    after: "styles/after.css.gz",
};
(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const report = {
        baseline: "9836b76ece37b654259c408a47cf64ce5cd7436b",
        implementation: "94eb340",
        input: {
            file: input,
            sha256: digest(source),
            japaneseReplacement: { before: english, after: japanese },
            artworkSha256: digest(artwork),
        },
        fonts: fonts.map(({ data, ...font }) => font),
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
        captures: {},
    };
    try {
        for (const [label, file] of Object.entries(styles)) {
            const theme = gunzipSync(
                fs.readFileSync(path.join(__dirname, file)),
            ).toString();
            report.captures[label] = {
                css: { file, sha256: digest(theme) },
                slides: {},
            };
            for (const language of ["english", "japanese"]) {
                const markdown = (
                    language === "english"
                        ? source
                        : source.replace(english, japanese)
                ).replaceAll(
                    "body-layout-media.svg",
                    `data:image/svg+xml;base64,${artwork.toString("base64")}`,
                );
                const marp = config.engine({});
                marp.themeSet.add(theme);
                const { html, css } = marp.render(markdown);
                const page = await browser.newPage({
                    viewport: { width: 1280, height: 720 },
                });
                await page.route(
                    /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
                    (route) => route.abort(),
                );
                await page.setContent(
                    `<meta charset="utf-8"><style>body{margin:0}${css}${fontCss}svg[data-marpit-svg]{display:block;width:1280px;height:720px}</style>${html}`,
                );
                await page.evaluate(async () => {
                    for (const weight of [400, 700])
                        await document.fonts.load(
                            `${weight} 26px 'Noto Sans JP'`,
                            "日本語",
                        );
                    await document.fonts.ready;
                    await Promise.all(
                        [...document.images].map((image) => image.decode()),
                    );
                });
                const slide = page.locator("section").nth(1);
                const measured = await slide.evaluate((section) => {
                    const caption = section.querySelector("figcaption");
                    const lines = new Map();
                    const walker = document.createTreeWalker(
                        caption,
                        NodeFilter.SHOW_TEXT,
                    );
                    for (let node; (node = walker.nextNode()); ) {
                        for (let offset = 0; offset < node.length; offset++) {
                            const char = node.textContent[offset];
                            if (/\s|\u200b/.test(char)) continue;
                            const range = document.createRange();
                            range.setStart(node, offset);
                            range.setEnd(node, offset + 1);
                            const box = range.getBoundingClientRect();
                            const key = Math.round(box.top);
                            const line = lines.get(key) || {
                                left: box.left,
                                right: box.right,
                                text: "",
                            };
                            line.left = Math.min(line.left, box.left);
                            line.right = Math.max(line.right, box.right);
                            line.text += char;
                            lines.set(key, line);
                        }
                    }
                    const widths = [...lines.values()].map(
                        (line) => line.right - line.left,
                    );
                    const rect = (node) => {
                        const box = node.getBoundingClientRect();
                        const origin = section.getBoundingClientRect();
                        return {
                            x: box.x - origin.x,
                            y: box.y - origin.y,
                            width: box.width,
                            height: box.height,
                        };
                    };
                    return {
                        text: section.textContent,
                        caption: caption.textContent,
                        phraseBreaks:
                            caption.textContent.split("\u200b").length - 1,
                        lines: [...lines.values()].map((line) => ({
                            text: line.text,
                            width: line.right - line.left,
                        })),
                        lineWidthRatio:
                            Math.min(...widths) / Math.max(...widths),
                        captionBox: rect(caption),
                        imageBox: rect(section.querySelector("img")),
                        bodyBox: rect(section.querySelector(".body")),
                        textWrapStyle: getComputedStyle(caption).textWrapStyle,
                    };
                });
                const cdp = await page.context().newCDPSession(page);
                await cdp.send("DOM.enable");
                await cdp.send("CSS.enable");
                const { root: doc } = await cdp.send("DOM.getDocument");
                const { nodeIds } = await cdp.send("DOM.querySelectorAll", {
                    nodeId: doc.nodeId,
                    selector: "figcaption",
                });
                measured.fontUsage = (
                    await cdp.send("CSS.getPlatformFontsForNode", {
                        nodeId: nodeIds[1],
                    })
                ).fonts;
                const name = `${language}-${label}`;
                const png = await slide.screenshot();
                fs.writeFileSync(path.join(output, `${name}.png`), png);
                measured.image = {
                    file: `${name}.png`,
                    sha256: digest(png),
                    bytes: png.length,
                };
                const singleSlide = await slide.evaluate(
                    (section) =>
                        section.closest("svg[data-marpit-svg]").outerHTML,
                );
                fs.writeFileSync(
                    path.join(output, `${name}.html`),
                    `<meta charset="utf-8"><title>Caption ${language} ${label}</title><style>body{margin:0}${css.replace(/@import[^;]+;/g, "")}${fontCss}svg[data-marpit-svg]{display:block;width:100vw;height:auto}</style>${singleSlide}`,
                );
                report.captures[label].slides[language] = measured;
                await page.close();
            }
        }
        fs.writeFileSync(
            path.join(output, "summary.json"),
            JSON.stringify(report, null, 2) + "\n",
        );
        console.log(
            JSON.stringify(
                Object.fromEntries(
                    Object.entries(report.captures).map(([label, capture]) => [
                        label,
                        Object.fromEntries(
                            Object.entries(capture.slides).map(
                                ([lang, slide]) => [
                                    lang,
                                    {
                                        ratio: slide.lineWidthRatio,
                                        lines: slide.lines.length,
                                        phraseBreaks: slide.phraseBreaks,
                                        fontUsage: slide.fontUsage,
                                    },
                                ],
                            ),
                        ),
                    ]),
                ),
                null,
                2,
            ),
        );
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
