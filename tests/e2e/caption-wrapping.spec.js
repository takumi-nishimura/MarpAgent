const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const config = require("../../marp.config");

// Optional fixed font for cross-browser verification on hosts without Japanese fonts.
const japaneseFontPath = process.env.MARP_AGENT_TEST_JAPANESE_FONT_PATH;
const fixedFont = japaneseFontPath
    ? `@font-face { font-family: "Noto Sans JP"; font-style: normal; font-weight: 400; src: url(data:font/ttf;base64,${fs.readFileSync(japaneseFontPath).toString("base64")}) format("truetype"); }`
    : "";

const englishCaption =
    "The caption stays with the evidence when it wraps to a second line with further necessary qualifications";
const artwork =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='600' height='400' fill='steelblue'/%3E%3C/svg%3E";

async function mount(
    page,
    {
        caption = englishCaption,
        classes = "",
        style = "",
        theme = "lab",
        paper = false,
    } = {},
) {
    const marp = config.engine({});
    marp.themeSet.add(
        fs.readFileSync(
            path.join(__dirname, `../../themes/${theme}.css`),
            "utf8",
        ),
    );
    const { html, css } = marp.render(`---
marp: true
theme: ${theme}
class: ${classes}
---
${style ? `<style scoped>${style}</style>` : ""}
${paper ? '<header class="paper-header">Paper</header>' : "## Evidence and its qualifications"}

<div class="body col visual" style="--visual-left: 2; --visual-right: 1">
<div><figure><img src="${artwork}" alt="Unchanged test evidence"><figcaption>${caption}</figcaption></figure></div>
<div><p>The evidence and its explanation retain their order.</p></div>
</div>
`);
    await page.route("https://fonts.googleapis.com/**", (route) =>
        route.abort(),
    );
    await page.setContent(
        `<style>body { margin: 0; }${css}${fixedFont}</style>${html}`,
    );
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode()));
    });
}

async function measureCaption(page) {
    return page.locator("figcaption").evaluate((element) => {
        const lines = new Map();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        for (let node; (node = walker.nextNode()); ) {
            for (let offset = 0; offset < node.length; offset++) {
                const character = node.textContent[offset];
                if (/\s|\u200b/.test(character)) continue;
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
                line.text += character;
                lines.set(key, line);
            }
        }
        const captionBox = element.getBoundingClientRect();
        const figure = element.closest("figure");
        const imageBox = figure.querySelector("img").getBoundingClientRect();
        return {
            text: element.textContent.replaceAll("\u200b", ""),
            lines: [...lines.values()].map((line) => ({
                text: line.text,
                width: line.right - line.left,
            })),
            phraseBreaks: element.textContent.split("\u200b").length - 1,
            wordBreak: getComputedStyle(element).wordBreak,
            imageBottom: imageBox.bottom,
            captionTop: captionBox.top,
            captionBottom: captionBox.bottom,
            figureBottom: figure.getBoundingClientRect().bottom,
            bodyBottom: element.closest(".body").getBoundingClientRect().bottom,
        };
    });
}

for (const classes of ["normal", "normal invert"]) {
    test(`lab ${classes}: captions balance short final lines while preserving text and fitting`, async ({
        page,
    }) => {
        await mount(page, { classes });
        const value = await measureCaption(page);
        expect(value.text).toBe(englishCaption);
        expect(value.lines).toHaveLength(2);
        const widths = value.lines.map((line) => line.width);
        expect(Math.min(...widths) / Math.max(...widths)).toBeGreaterThan(0.75);
        expect(value.imageBottom).toBeLessThan(value.captionTop);
        expect(value.captionBottom).toBeLessThanOrEqual(value.figureBottom + 1);
        expect(value.figureBottom).toBeLessThanOrEqual(value.bodyBottom + 1);
    });
}

test("Japanese captions keep BudouX phrase boundaries and explicit no-break runs", async ({
    page,
}) => {
    const caption =
        '図1．同じ測定条件で比較した結果を示す．<span class="nobr">異なる測定条件</span>へ一般化できることは示していない．';
    await mount(page, { caption });
    const value = await measureCaption(page);
    expect(value.text).toBe(caption.replace(/<[^>]+>/g, ""));
    expect(value.phraseBreaks).toBeGreaterThan(3);
    expect(value.wordBreak).toBe("keep-all");
    expect(value.lines.length).toBeGreaterThan(1);
    expect(
        value.lines.some((line) => line.text.includes("異なる測定条件")),
    ).toBe(true);
    await expect(page.locator(".nobr")).toHaveCSS("white-space", "nowrap");
    expect(value.captionBottom).toBeLessThanOrEqual(value.figureBottom + 1);
});

test("caption balancing respects authored wrapping and independent theme scales", async ({
    page,
}) => {
    await mount(page, {
        style: "section figcaption { text-wrap-style: auto; }",
    });
    const value = await measureCaption(page);
    const widths = value.lines.map((line) => line.width);
    expect(value.lines).toHaveLength(2);
    expect(Math.min(...widths) / Math.max(...widths)).toBeLessThan(0.5);
    await mount(page, { style: "section figcaption { white-space: nowrap; }" });
    expect((await measureCaption(page)).lines).toHaveLength(1);
    for (const options of [
        { paper: true },
        { theme: "muji" },
        { theme: "toshiba" },
    ]) {
        await mount(page, options);
        await expect(page.locator("figcaption")).toHaveCSS(
            "text-wrap-style",
            "auto",
        );
    }
});
