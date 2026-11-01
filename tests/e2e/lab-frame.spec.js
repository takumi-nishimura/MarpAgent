const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { Marp } = require("@marp-team/marp-core/full");

async function render(page, content, size = "16:9", bodyClass = "body box place-middle") {
    await renderSource(page, `---\ntheme: lab\nsize: ${size}\nheader: Context\npaginate: true\n---\n## Evidence and interpretation\n\n<div class="${bodyClass}">\n\n${content}\n\n</div>`);
}

async function renderSource(page, source, theme = "lab") {
    const marp = new Marp({ html: true });
    marp.themeSet.add(fs.readFileSync(path.join(__dirname, `../../themes/${theme}.css`), "utf8"));
    const { html, css } = marp.render(source);
    await page.route("https://fonts.googleapis.com/**", route => route.abort());
    await page.setContent(`<style>body { margin: 0; } ${css}</style>${html}`);
    await page.evaluate(() => document.fonts.ready);
}

test("the starter keeps a short explanation connected to its heading", async ({ page }) => {
    await renderSource(page, fs.readFileSync(path.join(__dirname, "../../template/slide.md"), "utf8"));
    await expect(page.locator("section:not(.title) > .body")).toHaveCount(1);
    const gap = await page.locator("section:not(.title)").evaluate(section => section.querySelector(".body p").getBoundingClientRect().top - section.querySelector("h2").getBoundingClientRect().bottom);
    expect(gap).toBeGreaterThanOrEqual(24);
    expect(gap).toBeLessThanOrEqual(52);
});

test("top placement retains a centered explanation's bounded reading width", async ({ page }) => {
    await render(page, "Keep the required evidence and qualifications together. ".repeat(8), "16:9", "body centered box place-top");
    const layout = await page.evaluate(() => {
        const body = document.querySelector(".body").getBoundingClientRect();
        const heading = document.querySelector("h2").getBoundingClientRect();
        const paragraph = document.querySelector(".body p").getBoundingClientRect();
        return { width: body.width, left: body.left, right: body.right, gap: paragraph.top - heading.bottom, linesHeight: paragraph.height };
    });
    expect(layout.width).toBeLessThanOrEqual(720);
    expect(layout.left).toBeCloseTo(1280 - layout.right, 0);
    expect(layout.gap).toBeGreaterThanOrEqual(24);
    expect(layout.gap).toBeLessThanOrEqual(52);
    expect(layout.linesHeight).toBeGreaterThan(50);
});

for (const size of ["16:9", "4:3"]) {
    test(`lab ${size}: the frame separates context, heading, and centered body`, async ({ page }) => {
        await render(page, "A supported observation and its qualification.", size);
        const layout = await page.evaluate(() => {
            const rect = selector => {
                const { top, bottom, left, right, height } = document.querySelector(selector).getBoundingClientRect();
                return { top, bottom, left, right, height };
            };
            const headerText = document.createRange();
            headerText.selectNodeContents(document.querySelector("header"));
            return {
                slide: rect("section"), header: rect("header"), heading: rect("h2"),
                body: rect(".body"), point: rect(".body p"),
                headerTextLeft: headerText.getBoundingClientRect().left,
                headerFont: parseFloat(getComputedStyle(document.querySelector("header")).fontSize),
                bodyFont: parseFloat(getComputedStyle(document.querySelector(".body p")).fontSize),
            };
        });
        expect(layout.heading.left - layout.slide.left).toBeGreaterThanOrEqual(60);
        expect(layout.header.left).toBeCloseTo(layout.slide.left, 0);
        expect(layout.header.right).toBeCloseTo(layout.slide.right, 0);
        expect(layout.headerTextLeft).toBeCloseTo(layout.heading.left, 0);
        expect(layout.heading.top - layout.header.bottom).toBeGreaterThanOrEqual(16);
        expect(layout.headerFont / layout.bodyFont).toBeLessThanOrEqual(0.8);
        expect(layout.body.height).toBeGreaterThan(layout.slide.height * 0.5);
        expect(layout.point.left).toBeCloseTo(layout.heading.left, 0);
        expect((layout.point.top + layout.point.bottom) / 2).toBeCloseTo((layout.body.top + layout.body.bottom) / 2, 0);
        expect(layout.point.bottom).toBeLessThan(layout.slide.bottom - 20);
    });
}

for (const size of ["16:9", "4:3"]) {
    test(`lab ${size}: default body keeps the heading close regardless of content amount`, async ({ page }) => {
        const gaps = [];
        for (const count of [1, 5]) {
            await render(page, Array.from({ length: count }, () => "Evidence with its required qualification.").join("\n\n"), size, "body box");
            const gap = await page.evaluate(() => document.querySelector(".body p").getBoundingClientRect().top - document.querySelector("h2").getBoundingClientRect().bottom);
            expect(gap).toBeGreaterThanOrEqual(24);
            expect(gap).toBeLessThanOrEqual(52);
            gaps.push(gap);
        }
        expect(gaps[0]).toBeCloseTo(gaps[1], 0);
    });
}

test("middle placement keeps oversized text below the heading without shrinking or hiding it", async ({ page }) => {
    await render(page, Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}: required evidence and qualification.`).join("\n\n"));
    const layout = await page.evaluate(() => {
        const body = document.querySelector(".body");
        const paragraphs = [...body.querySelectorAll("p")];
        return {
            top: body.getBoundingClientRect().top,
            bottom: body.getBoundingClientRect().bottom,
            first: paragraphs[0].getBoundingClientRect().top,
            last: paragraphs.at(-1).getBoundingClientRect().bottom,
            sizes: paragraphs.map(node => parseFloat(getComputedStyle(node).fontSize)),
            hidden: paragraphs.some(node => ["hidden", "none"].includes(getComputedStyle(node).visibility) || getComputedStyle(node).display === "none"),
            overflow: getComputedStyle(body).overflowY,
        };
    });
    expect(layout.first).toBeGreaterThanOrEqual(layout.top - 1);
    expect(layout.last).toBeGreaterThan(layout.bottom);
    expect(layout.sizes.every(size => size >= 26)).toBe(true);
    expect(layout.hidden).toBe(false);
    expect(layout.overflow).toBe("visible");
});

test("a body group uses one spacing rhythm between prose and a comparison table", async ({ page }) => {
    await render(page, "Choose a delivery format.\n\n| Format | Use |\n| --- | --- |\n| PDF | Reading |\n| HTML | Presenting |\n\nKeep the required qualifications.");
    const gaps = await page.locator(".body").evaluate(body => {
        const children = [...body.children].map(node => node.getBoundingClientRect());
        return children.slice(1).map((rect, i) => rect.top - children[i].bottom);
    });
    expect(gaps).toHaveLength(2);
    for (const gap of gaps) expect(gap).toBeCloseTo(13, 0);
});

for (const theme of ["lab", "muji", "toshiba"]) {
    test(`${theme}: native quotations stay grouped and retain the prose size`, async ({ page }) => {
        await renderSource(page, `---\ntheme: ${theme}\n---\n## Request example\n\n<div class="body box">\n\nContext before the quotation.\n\n> Keep the supplied sources.\n>\n> Show the important figure.\n\nContext after the quotation.\n\n</div>`, theme);
        const layout = await page.locator(".body").evaluate(body => {
            const quote = body.querySelector("blockquote");
            const first = quote.firstElementChild;
            const last = quote.lastElementChild;
            return {
                proseFont: parseFloat(getComputedStyle(body.querySelector("p")).fontSize),
                quoteFont: parseFloat(getComputedStyle(first).fontSize),
                border: parseFloat(getComputedStyle(quote).borderLeftWidth),
                padding: parseFloat(getComputedStyle(quote).paddingTop),
                firstMargin: parseFloat(getComputedStyle(first).marginTop),
                lastMargin: parseFloat(getComputedStyle(last).marginBottom),
            };
        });
        expect(layout.quoteFont).toBe(layout.proseFont);
        expect(layout.border).toBeGreaterThan(0);
        expect(layout.padding).toBeGreaterThan(0);
        expect(layout.firstMargin).toBe(0);
        expect(layout.lastMargin).toBe(0);
    });
}
