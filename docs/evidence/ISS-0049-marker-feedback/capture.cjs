const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
// Archived capture harness with paths replaced by arguments and CSS snapshots.
const { gunzipSync } = require("node:zlib");
const root = path.resolve(__dirname, "../../..");
const saved = require("./summary.json");
const { chromium } = require(path.join(root, "node_modules/playwright"));
const config = require(path.join(root, "marp.config"));
const [label, fontArgument, outputArgument] = process.argv.slice(2);
if (!["before", "after"].includes(label) || !fontArgument || !outputArgument || !process.env.FONTCONFIG_FILE) {
    console.error("Usage: FONTCONFIG_FILE=<fonts.conf> node capture.cjs <before|after> <font-directory> <output-directory>");
    process.exit(2);
}
const output = path.resolve(outputArgument);
const fontDir = path.resolve(fontArgument);
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
(async () => {
    fs.mkdirSync(output, { recursive: true });
    const input = "fixtures/lab-typography-slide.md";
    const markdown = fs.readFileSync(path.join(root, input), "utf8");
    const theme = gunzipSync(fs.readFileSync(path.join(__dirname, saved.captures[label].css.file)));
    if (digest(theme) !== saved.captures[label].css.sha256 || digest(markdown) !== saved.input.sha256) throw new Error("CSS or input hash changed; use the evidence revision");
    fs.writeFileSync(path.join(output, `${label}.css`), theme);
    const marp = config.engine({});
    marp.themeSet.add(theme.toString());
    const { html, css } = marp.render(markdown);
    const fonts = [400, 700].map((weight) => ({ weight, file: `NotoSansJP-${weight}.ttf`, sha256: digest(fs.readFileSync(path.join(fontDir, `NotoSansJP-${weight}.ttf`))) }));
    for (const font of fonts) if (font.sha256 !== saved.fonts.find((entry) => entry.weight === font.weight)?.sha256) throw new Error("Font hash changed");
    const fontCss = fonts.map(({ weight, file }) => `@font-face { font-family: 'Noto Sans JP'; font-weight: ${weight}; font-style: normal; src: url('${pathToFileURL(path.join(fontDir, file)).href}'); }`).join("\n");
    const htmlPath = path.join(output, `${label}.html`);
    fs.writeFileSync(htmlPath, `<meta charset="utf-8"><base href="${pathToFileURL(path.join(root, "fixtures/")).href}"><style>body{margin:0}${css}\n${fontCss}\nsvg[data-marpit-svg]{display:block;width:1280px;height:720px}</style>${html}`);
    const browser = await chromium.launch({ headless: true, env: process.env });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
        await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
        await page.evaluate(async () => {
            for (const weight of [400, 700]) await document.fonts.load(`${weight} 26px "Noto Sans JP"`, "日本語");
            await document.fonts.ready;
            await Promise.all([...document.querySelectorAll("img")].map((img) => img.decode()));
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        const slides = await page.locator("section").evaluateAll((sections) => [1, 3].map((index) => {
            const section = sections[index];
            const origin = section.getBoundingClientRect();
            return { slide: index + 1, text: section.textContent, pagination: [section.getAttribute("data-marpit-pagination"), section.getAttribute("data-marpit-pagination-total")], elements: [...section.querySelectorAll("em,.marker,mark,strong")].map((element) => {
                const style = getComputedStyle(element);
                const rects = [...element.getClientRects()].map((rect) => ({ left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height }));
                const stop = style.backgroundImage.match(/\s(\d+)%/);
                const bandStart = stop ? Number(stop[1]) / 100 : 0;
                return { tag: element.tagName, class: element.className, text: element.textContent, weight: style.fontWeight, size: style.fontSize, leading: style.lineHeight, color: style.color, background: style.backgroundImage, fill: style.backgroundColor, decoration: style.boxDecorationBreak, rects, bands: rects.map((r) => ({ left: r.left, top: r.top + r.height * bandStart, width: r.width, height: r.height * (1 - bandStart), bottom: r.top + r.height })) };
            }) };
        }));
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("DOM.enable");
        await cdp.send("CSS.enable");
        const { root: doc } = await cdp.send("DOM.getDocument", { depth: 0 });
        const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: doc.nodeId, selector: "section" });
        const fontUsage = {};
        for (const selector of ["em", ".marker", "mark", "strong"]) {
            const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: nodeIds[1], selector });
            fontUsage[selector] = (await cdp.send("CSS.getPlatformFontsForNode", { nodeId })).fonts;
        }
        const images = [];
        for (const [index, name] of [[1, "light"], [3, "dark"]]) {
            const bytes = await page.locator("section").nth(index).screenshot();
            const file = `${label}-${name}.png`;
            fs.writeFileSync(path.join(output, file), bytes);
            images.push({ file, sha256: digest(bytes), bytes: bytes.length });
        }
        const report = { label, input, inputSha256: digest(markdown), cssSha256: digest(theme), environment: { node: process.version, chromium: browser.version(), viewport: { width: 1280, height: 720 }, dpr: 1 }, fonts, fontUsage, slides, images };
        fs.writeFileSync(path.join(output, `${label}.json`), JSON.stringify(report, null, 2) + "\n");
        console.log(JSON.stringify({ cssSha256: report.cssSha256, fontUsage, elements: slides[0].elements }, null, 2));
    } finally {
        await browser.close();
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
