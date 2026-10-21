const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { Marp } = require("@marp-team/marp-core/full");
const { auditSlidesInPage } = require("../../src/visual-overflow");

const landscape = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="steelblue"/><circle cx="600" cy="400" r="300" fill="gold"/></svg>')}`;

async function render(page, content, { theme = "lab", size = "16:9", header = true } = {}) {
    const marp = new Marp({ html: true });
    marp.themeSet.add(fs.readFileSync(path.join(__dirname, `../../themes/${theme}.css`), "utf8"));
    const { html, css } = marp.render(`---\ntheme: ${theme}\nsize: ${size}\npaginate: true\n${header ? 'header: "Layout contract"\n' : ""}footer: "Source and conditions"\n---\n${content}`);
    await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
    await page.setContent(`<style>body { margin: 0; } ${css}</style>${html}`);
    await page.locator("img").evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
}

async function boxes(page) {
    return page.evaluate(() => {
        const rect = (element) => {
            const { top, bottom, left, right, width, height } = element.getBoundingClientRect();
            return { top, bottom, left, right, width, height };
        };
        const body = document.querySelector(".body");
        return {
            slide: rect(document.querySelector("section")),
            heading: rect(document.querySelector("h2")),
            body: rect(body),
            footer: rect(document.querySelector("footer")),
            safe: parseFloat(getComputedStyle(body).marginBottom),
            figures: [...document.querySelectorAll("figure")].map((figure) => ({
                ...rect(figure),
                caption: rect(figure.querySelector("figcaption")),
                media: [...figure.querySelectorAll("img, video, svg")].map((media) => ({
                    ...rect(media), fit: getComputedStyle(media).objectFit,
                })),
            })),
        };
    });
}

function expectFitted(layout) {
    expect(layout.body.height).toBeGreaterThan(100);
    expect(layout.body.top).toBeGreaterThanOrEqual(layout.heading.bottom - 1);
    expect(layout.body.bottom).toBeLessThanOrEqual(layout.footer.top - 1);
    for (const figure of layout.figures) {
        expect(figure.top).toBeGreaterThanOrEqual(layout.body.top - 1);
        expect(figure.bottom).toBeLessThanOrEqual(layout.body.bottom + 1);
        expect(figure.caption.bottom).toBeLessThanOrEqual(figure.bottom + 1);
        for (const media of figure.media) {
            expect(media.height).toBeGreaterThan(20);
            expect(media.top).toBeGreaterThanOrEqual(figure.top - 1);
            expect(media.bottom).toBeLessThanOrEqual(figure.caption.top - 1);
            expect(media.width).toBeLessThanOrEqual(figure.width + 1);
            expect(media.fit).toBe("contain");
        }
    }
}

for (const theme of ["lab", "muji", "toshiba"]) {
    test(`${theme}: nested fill preserves both placement axes in equal-height columns`, async ({ page }) => {
        await render(page, `
<h2>Independent placement axes</h2>
<div class="body box">
<h3>Heading before the remaining-area row</h3>
<div class="col fill" style="--col-gap: 30px">
<div id="top" class="place-top place-left"><div class="fit">Top left</div></div>
<div id="middle" class="place-middle place-center"><div class="fit">Middle center</div></div>
<div id="bottom" class="place-bottom place-right"><div class="fit">Bottom right</div></div>
</div>
</div>`, { theme });
        const columns = await page.evaluate(() => ["top", "middle", "bottom"].map((id) => {
            const column = document.getElementById(id);
            const rect = (element) => {
                const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
                return { left, right, top, bottom, width, height };
            };
            return { outer: rect(column), content: rect(column.firstElementChild) };
        }));
        const [top, middle, bottom] = columns;
        expect(top.outer.height).toBeGreaterThan(200);
        expect(top.outer.height).toBeCloseTo(middle.outer.height, 1);
        expect(top.outer.height).toBeCloseTo(bottom.outer.height, 1);
        expect(top.content.top).toBeCloseTo(top.outer.top, 1);
        expect(top.content.left).toBeCloseTo(top.outer.left, 1);
        expect((middle.content.top + middle.content.bottom) / 2).toBeCloseTo((middle.outer.top + middle.outer.bottom) / 2, 1);
        expect((middle.content.left + middle.content.right) / 2).toBeCloseTo((middle.outer.left + middle.outer.right) / 2, 1);
        expect(bottom.content.bottom).toBeCloseTo(bottom.outer.bottom, 1);
        expect(bottom.content.right).toBeCloseTo(bottom.outer.right, 1);
        expect(middle.outer.left - top.outer.right).toBeCloseTo(30, 1);
    });

    for (const size of ["16:9", "4:3"]) {
        test(`${theme} ${size}: body gives an extra heading or caption line space before fitting media`, async ({ page }) => {
            const layouts = [];
            for (const [heading, caption] of [
                ["Evidence", "Source and conditions"],
                ["Evidence<br>Second heading line", "Source and conditions"],
                ["Evidence", "Source and conditions<br>Second caption line"],
            ]) {
                await render(page, `<h2>${heading}</h2>\n<div class="body box">\n<figure><img src="${landscape}" alt="Generic result"/><figcaption>${caption}</figcaption></figure>\n</div>`, { theme, size });
                const layout = await boxes(page);
                expectFitted(layout);
                layouts.push(layout);
            }
            expect(layouts[1].body.height).toBeLessThan(layouts[0].body.height - 10);
            expect(layouts[2].figures[0].media[0].height).toBeLessThan(layouts[0].figures[0].media[0].height - 5);
            expect(layouts[1].body.bottom).toBeCloseTo(layouts[0].body.bottom, 1);
        });
    }
}

test("body without a header and a heading inside a column shares the remaining area with stacked figures", async ({ page }) => {
    await render(page, `
<h2>Stacked evidence</h2>
<div class="body col visual" style="--visual-left: 2; --visual-right: 1; --visual-gap: 30px">
<div id="stack">
<h3>Column heading</h3>
<figure><img src="${landscape}" alt="First result"/><figcaption>First condition</figcaption></figure>
<figure><img src="${landscape}" alt="Second result"/><figcaption>Second condition with another line<br>Further qualification</figcaption></figure>
</div>
<div id="explanation" class="place-middle"><p>Interpretation stays readable.</p></div>
</div>`, { header: false });
    const layout = await boxes(page);
    expectFitted(layout);
    expect(layout.figures[0].bottom).toBeLessThanOrEqual(layout.figures[1].top + 1);
    const columns = await page.evaluate(() => {
        const stack = document.querySelector("#stack").getBoundingClientRect();
        const explanation = document.querySelector("#explanation").getBoundingClientRect();
        const heading = document.querySelector("h3").getBoundingClientRect();
        return { ratio: stack.width / explanation.width, gap: explanation.left - stack.right, headingBottom: heading.bottom };
    });
    expect(columns.ratio).toBeCloseTo(2, 2);
    expect(columns.gap).toBeCloseTo(30, 1);
    expect(layout.figures[0].top).toBeGreaterThanOrEqual(columns.headingBottom - 1);
});

test("stacked image, SVG, and video share a figure without displacing its caption", async ({ page }) => {
    await render(page, `
<h2>Three media, one caption</h2>
<div class="body box">
<figure>
<img src="${landscape}" alt="Image"/>
<svg viewBox="0 0 1200 800" width="1200" height="800" aria-label="Vector"><circle cx="600" cy="400" r="300"/></svg>
<video poster="${landscape}" aria-label="Video poster" muted></video>
<figcaption>One shared source and condition<br>Another caption line</figcaption>
</figure>
</div>`);
    const layout = await boxes(page);
    expectFitted(layout);
    const media = layout.figures[0].media;
    expect(media).toHaveLength(3);
    for (let index = 1; index < media.length; index += 1) {
        expect(media[index].top).toBeGreaterThan(media[index - 1].bottom);
        expect(media[index].height).toBeCloseTo(media[0].height, 1);
    }
    expect(await page.locator("figure > svg").getAttribute("viewBox")).toBe("0 0 1200 800");
    const intrinsic = await page.locator("img").evaluate((img) => img.naturalWidth / img.naturalHeight);
    expect(intrinsic).toBeCloseTo(1.5, 2);
});

test("body keeps genuinely oversized text visible to rendered diagnostics", async ({ page }) => {
    await render(page, `<h2>Too much content</h2>\n<div class="body box"><p>${"A required qualification.<br>".repeat(35)}</p></div>`);
    const audits = await page.evaluate(auditSlidesInPage, {
        tolerancePx: 2, overlapTolerancePx: 2, mediaToleranceRatio: 0.02,
        safeMarginPx: 20, referenceWidthPx: 1280, referenceHeightPx: 720,
        bodyFloorPx: 12, secondaryFloorPx: 8,
    });
    expect(audits[0].clipped.length + audits[0].overlaps.length).toBeGreaterThan(0);
    expect(audits[0].smallText).toHaveLength(0);
    expect(await page.locator(".body").evaluate((body) => getComputedStyle(body).overflowY)).toBe("visible");
});

test("natural figures keep authored inline dimensions and fitting figures keep explicit crop", async ({ page }) => {
    await render(page, `
<h2>Authored media constraints</h2>
<div class="body col">
<div class="place-middle">
<figure class="figure-natural"><img id="natural" src="${landscape}" alt="Intentional crop" style="width: 480px; height: 180px; object-fit: cover; object-position: 25% 30%"/><figcaption>Authored dimensions</figcaption></figure>
</div>
<div>
<figure><img id="crop" src="${landscape}" alt="Explicit crop in a fitting figure" style="object-fit: cover; object-position: 25% 30%"/><figcaption>Intentional viewport</figcaption></figure>
</div>
</div>`);
    const media = await page.locator("img").evaluateAll((images) => images.map((image) => {
        const { width, height } = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return { width, height, fit: style.objectFit, position: style.objectPosition };
    }));
    expect(media[0].width).toBeCloseTo(480, 1);
    expect(media[0].height).toBeCloseTo(180, 1);
    for (const image of media) {
        expect(image.fit).toBe("cover");
        expect(image.position).toBe("25% 30%");
    }
});
