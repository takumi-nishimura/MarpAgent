const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { Marp } = require("@marp-team/marp-core/full");

const artwork = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="steelblue"/><circle cx="320" cy="240" r="160" fill="gold"/></svg>',
)}`;
const offlineFonts = "section, section * { font-family: sans-serif !important; }";

test.beforeEach(async ({ page }) => {
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
        route.abort(),
    );
});

for (const theme of ["lab", "muji", "toshiba"]) {
    for (const placement of ["top", "middle", "bottom", "spread"]) {
        test(`${theme}: legacy col.fill preserves authored widths and place-${placement}`, async ({
            page,
        }) => {
            const marp = new Marp({ html: true });
            marp.themeSet.add(
                fs.readFileSync(
                    path.join(__dirname, `../../themes/${theme}.css`),
                    "utf8",
                ),
            );
            const { html, css } = marp.render(`---
theme: ${theme}
header: Legacy composition
---
## Evidence and interpretation

<div id="columns" class="col fill">
<div id="wide" class="place-${placement}" style="flex: 2 1 0">
<div>Evidence</div>
<div>Required qualification</div>
</div>
<div id="narrow" class="place-${placement}" style="flex: 1 1 0">
<div>Interpretation</div>
<div>Next action</div>
</div>
</div>
`);
            await page.setContent(
                `<style>body { margin: 0; } ${css} ${offlineFonts}</style>${html}`,
            );
            await page.evaluate(() => document.fonts.ready.then(() => {}));
            await expect(page.locator(".body")).toHaveCount(0);

            const layout = await page.evaluate(() => {
                const elements = [
                    document.querySelector("section"),
                    document.querySelector("h2"),
                    document.querySelector("#columns"),
                    document.querySelector("#wide"),
                    document.querySelector("#narrow"),
                    ...document.querySelectorAll("#columns > div > div"),
                ];
                return {
                    rects: elements.map((element) => {
                        const { left, right, top, bottom, width, height } =
                            element.getBoundingClientRect();
                        return { left, right, top, bottom, width, height };
                    }),
                    gap: parseFloat(
                        getComputedStyle(document.querySelector("#columns"))
                            .columnGap,
                    ),
                };
            });
            const [slide, heading, columns, wide, narrow, ...items] =
                layout.rects;
            expect(columns.height).toBeGreaterThan(0);
            expect(columns.top).toBeGreaterThanOrEqual(heading.bottom - 1);
            expect(columns.bottom).toBeLessThan(slide.bottom);
            expect(columns.left).toBeGreaterThanOrEqual(slide.left);
            expect(columns.right).toBeLessThanOrEqual(slide.right);
            expect(wide.width / narrow.width).toBeCloseTo(2, 2);
            expect(layout.gap).toBeGreaterThan(0);
            expect(narrow.left - wide.right).toBeCloseTo(layout.gap, 0);
            expect(narrow.right).toBeCloseTo(columns.right, 0);

            for (const [index, column] of [wide, narrow].entries()) {
                const [first, last] = items.slice(index * 2, index * 2 + 2);
                expect(column.top).toBeCloseTo(columns.top, 0);
                expect(column.bottom).toBeCloseTo(columns.bottom, 0);
                expect(first.height).toBeGreaterThan(0);
                expect(last.height).toBeGreaterThan(0);
                expect(first.top).toBeGreaterThanOrEqual(column.top - 1);
                expect(last.bottom).toBeLessThanOrEqual(column.bottom + 1);
                expect(first.bottom).toBeLessThanOrEqual(last.top + 1);
                // Each placement uses the stretched column, not its text height.
                expect(column.height).toBeGreaterThan(
                    first.height + last.height,
                );
                if (placement === "top" || placement === "spread") {
                    expect(first.top).toBeCloseTo(column.top, 0);
                }
                if (placement === "bottom" || placement === "spread") {
                    expect(last.bottom).toBeCloseTo(column.bottom, 0);
                }
                if (placement === "middle") {
                    expect((first.top + last.bottom) / 2).toBeCloseTo(
                        (column.top + column.bottom) / 2,
                        0,
                    );
                }
            }
        });
    }

    test(`${theme}: legacy box.fill keeps an explicitly sized, cropped figure`, async ({
        page,
    }) => {
        const marp = new Marp({ html: true });
        marp.themeSet.add(
            fs.readFileSync(
                path.join(__dirname, `../../themes/${theme}.css`),
                "utf8",
            ),
        );
        const { html, css } = marp.render(`---
theme: ${theme}
header: Legacy composition
---
## An intentional crop

<div class="box fill place-middle place-center">
<figure>
<img src="${artwork}" alt="Deliberately cropped artwork" style="width: 320px; height: 180px; flex: none; object-fit: cover">
<figcaption>Author-selected crop</figcaption>
</figure>
</div>
`);
        await page.setContent(
            `<style>body { margin: 0; } ${css} ${offlineFonts}</style>${html}`,
        );
        await page.locator("img").evaluate((image) => image.decode());
        await page.evaluate(() => document.fonts.ready.then(() => {}));
        await expect(page.locator(".body")).toHaveCount(0);
        await expect(page.locator("section > .box.fill > figure")).toHaveCount(1);

        const layout = await page.evaluate(() => {
            const image = document.querySelector("img");
            return {
                rects: [
                    document.querySelector("section"),
                    document.querySelector("h2"),
                    document.querySelector(".box.fill"),
                    document.querySelector("figure"),
                    image,
                    document.querySelector("figcaption"),
                ].map((element) => {
                    const { left, right, top, bottom, width, height } =
                        element.getBoundingClientRect();
                    return { left, right, top, bottom, width, height };
                }),
                fit: getComputedStyle(image).objectFit,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
            };
        });
        const [slide, heading, box, figure, image, caption] = layout.rects;
        expect(layout.naturalWidth).toBe(640);
        expect(layout.naturalHeight).toBe(480);
        // Explicit flex sizing opts out of legacy growth for this 16:9 crop.
        expect(image.width).toBeCloseTo(320, 0);
        expect(image.height).toBeCloseTo(180, 0);
        expect(layout.fit).toBe("cover");
        expect(figure.width).toBeCloseTo(image.width, 0);
        expect(box.top).toBeGreaterThanOrEqual(heading.bottom - 1);
        expect(box.bottom).toBeLessThan(slide.bottom);
        expect(figure.top).toBeGreaterThanOrEqual(box.top - 1);
        expect(figure.bottom).toBeLessThanOrEqual(box.bottom + 1);
        expect(image.left).toBeGreaterThanOrEqual(box.left - 1);
        expect(image.right).toBeLessThanOrEqual(box.right + 1);
        expect((image.left + image.right) / 2).toBeCloseTo(
            (box.left + box.right) / 2,
            0,
        );
        expect((figure.top + figure.bottom) / 2).toBeCloseTo(
            (box.top + box.bottom) / 2,
            0,
        );
        expect(caption.top).toBeGreaterThan(image.bottom);
        expect(caption.height).toBeGreaterThan(0);
        expect(caption.bottom).toBeLessThanOrEqual(figure.bottom + 1);
    });

    test(`${theme}: legacy title fill stays on canvas without resetting title margins`, async ({
        page,
    }) => {
        const marp = new Marp({ html: true });
        marp.themeSet.add(
            fs.readFileSync(
                path.join(__dirname, `../../themes/${theme}.css`),
                "utf8",
            ),
        );
        const { html, css } = marp.render(`---
theme: ${theme}
class: title
---
# Legacy title

Author and affiliation

---

# Legacy title

Author and affiliation

<div class="box fill place-bottom place-center">
<img src="${artwork}" alt="Title artwork" style="width: 120px; height: 90px">
</div>
`);
        await page.setContent(
            `<style>body { margin: 0; } ${css} ${offlineFonts}</style>${html}`,
        );
        await page.locator("img").evaluate((image) => image.decode());
        await page.evaluate(() => document.fonts.ready.then(() => {}));
        await expect(page.locator(".body")).toHaveCount(0);
        await expect(page.locator("section.title")).toHaveCount(2);

        const [control, placed] = await page.locator("section").evaluateAll(
            (sections) =>
                sections.map((section) => {
                    const heading = section.querySelector("h1");
                    const subtitle = section.querySelector(":scope > p");
                    return {
                        rects: [
                            section,
                            heading,
                            subtitle,
                            section.querySelector(".fill"),
                            section.querySelector("img"),
                        ].map((element) => {
                            if (!element) return null;
                            const { left, right, top, bottom, width, height } =
                                element.getBoundingClientRect();
                            return { left, right, top, bottom, width, height };
                        }),
                        headingMarginTop: parseFloat(
                            getComputedStyle(heading).marginTop,
                        ),
                        headingMarginBottom: parseFloat(
                            getComputedStyle(heading).marginBottom,
                        ),
                        subtitleMarginTop: parseFloat(
                            getComputedStyle(subtitle).marginTop,
                        ),
                        subtitleMarginBottom: parseFloat(
                            getComputedStyle(subtitle).marginBottom,
                        ),
                        paddingBottom: parseFloat(
                            getComputedStyle(section).paddingBottom,
                        ),
                    };
                }),
        );
        // Compare margins, not collapsed block gaps: adding .fill opts into flex.
        expect(placed.headingMarginTop).toBeGreaterThan(0);
        expect(placed.subtitleMarginTop).toBeGreaterThan(0);
        for (const margin of [
            "headingMarginTop",
            "headingMarginBottom",
            "subtitleMarginTop",
            "subtitleMarginBottom",
        ]) {
            expect(placed[margin]).toBeCloseTo(control[margin], 1);
        }
        const [slide, heading, subtitle, fill, image] = placed.rects;
        expect(heading.top - slide.top).toBeCloseTo(
            control.rects[1].top - control.rects[0].top,
            0,
        );
        expect(subtitle.top).toBeGreaterThanOrEqual(heading.bottom - 1);
        expect(fill.top).toBeGreaterThanOrEqual(subtitle.bottom - 1);
        expect(fill.bottom).toBeCloseTo(slide.bottom - placed.paddingBottom, 0);
        for (const element of [heading, subtitle, fill, image]) {
            expect(element.width).toBeGreaterThan(0);
            expect(element.height).toBeGreaterThan(0);
            expect(element.top).toBeGreaterThanOrEqual(slide.top - 1);
            expect(element.bottom).toBeLessThanOrEqual(slide.bottom + 1);
            expect(element.left).toBeGreaterThanOrEqual(slide.left - 1);
            expect(element.right).toBeLessThanOrEqual(slide.right + 1);
        }
        expect(image.top).toBeGreaterThanOrEqual(fill.top - 1);
        expect(image.bottom).toBeCloseTo(fill.bottom, 0);
        expect((image.left + image.right) / 2).toBeCloseTo(
            (fill.left + fill.right) / 2,
            0,
        );
    });
}
