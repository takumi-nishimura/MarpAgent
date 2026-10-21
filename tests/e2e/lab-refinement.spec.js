const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const config = require("../../marp.config");

const content = `
## Evidence and interpretation

<div class="col">
<div>

Body text with **colored strong** and *a marker*.

<span class="marker">A utility marker</span> and <mark>a full marker</mark>.

</div>
<figure>
<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80'%3E%3Crect width='200' height='80' fill='gray'/%3E%3C/svg%3E" />
<figcaption>Figure 1. An unchanged image and its explanation.</figcaption>
</figure>
</div>

| Method | Observation |
| :----- | :---------- |
| A | Measured result |

<div class="footnote">[1] A source and its qualification.</div>
`;

async function mount(page, markdown, theme = "lab") {
    const marp = config.engine({});
    marp.themeSet.add(
        fs.readFileSync(
            path.join(__dirname, `../../themes/${theme}.css`),
            "utf8",
        ),
    );
    const { html, css } = marp.render(markdown);
    await page.route("https://fonts.googleapis.com/**", (route) =>
        route.abort(),
    );
    await page.setContent(`<style>body { margin: 0; } ${css}</style>${html}`);
    await page.evaluate(() => document.fonts.ready.then(() => {}));
}

async function render(
    page,
    { theme = "lab", classes = "", paper = false, style = "" } = {},
) {
    await mount(
        page,
        `---\ntheme: ${theme}\nclass: ${classes}\nstyle: |\n  ${style}\n---\n` +
            (paper
                ? '<header class="paper-header">Paper title</header>\n\n'
                : "") +
            content,
        theme,
    );
    return page.evaluate(() => {
        const style = (selector) => {
            const value = getComputedStyle(document.querySelector(selector));
            return {
                size: parseFloat(value.fontSize),
                weight: value.fontWeight,
                leading: parseFloat(value.lineHeight),
                color: value.color,
                background: value.backgroundImage,
                fill: value.backgroundColor,
                decoration: value.boxDecorationBreak,
            };
        };
        return {
            body: style("section"),
            heading: style("h2"),
            strong: style("strong"),
            emphasis: style("em"),
            marker: style(".marker"),
            mark: style("mark"),
            caption: style("figcaption"),
            footnote: style(".footnote"),
            table: style("td"),
            columnDisplay: getComputedStyle(document.querySelector(".col"))
                .display,
        };
    });
}

test("plain lab uses readable type roles and preserves colored emphasis", async ({
    page,
}) => {
    const value = await render(page);
    expect(value.strong.weight).toBe("700");
    expect(value.body.size).toBe(26);
    expect(value.body.leading).toBe(39);
    expect(value.heading.size).toBe(39);
    expect(value.heading.leading).toBeCloseTo(46.8, 1);
    expect(value.strong.color).not.toBe(value.body.color);
    expect(value.caption.size).toBe(19.5);
    expect(value.caption.leading).toBeCloseTo(25.35, 1);
    expect(value.footnote.size).toBe(14);
    expect(value.footnote.leading).toBeCloseTo(19.6, 1);
    expect(value.table.size).toBe(22.75);
    expect(value.emphasis.background).toContain("linear-gradient");
    expect(value.marker.background).toContain("linear-gradient");
    expect(value.emphasis.decoration).toBe("clone");
    expect(value.columnDisplay).toBe("flex");
});

test("plain lab keeps invert and named-scheme emphasis colored", async ({
    page,
}) => {
    for (const [scheme, dark] of [
        ["", false],
        ["invert", true],
        ["dracula", true],
        ["dracula invert", true],
        ["one-dark", true],
        ["nord", true],
        ["neogaia", true],
        ["neogaia invert", false],
        ["github-light", false],
        ["github-light invert", false],
    ]) {
        const value = await render(page, { classes: scheme });
        expect(value.strong.weight).toBe("700");
        expect(value.strong.color).not.toBe(value.body.color);
        expect(value.emphasis.background).toContain("linear-gradient");
        expect(value.mark.background).toContain("linear-gradient");
        expect(value.mark.background).toContain(
            dark ? "rgba(250, 220, 90, 0.2)" : "rgba(215, 182, 0, 0.24)",
        );
        expect(value.mark.color).toBe(value.body.color);
        expect(value.table.color).toBe(value.body.color);
    }
});

test("lab mark references use an inset fill across wrapped lines while em stays a band", async ({
    page,
}) => {
    const source = fs
        .readFileSync(
            path.join(__dirname, "../../fixtures/lab-typography-slide.md"),
            "utf8",
        )
        .replaceAll(
            "fig.png",
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80'/%3E",
        )
        .replaceAll(
            "<mark>要確認</mark>",
            "<mark>同じ測定条件で比較した結果であり，参加者や装置が異なる条件への一般化は示していない</mark>",
        );
    await mount(page, source);
    const values = await page.locator("section").evaluateAll((sections) =>
        [sections[1], sections[3]].map((section) => {
            const bands = (selector) => {
                const element = section.querySelector(selector);
                const style = getComputedStyle(element);
                // Compare painted fragments with their inline boxes, including
                // the transparent top and bottom of a reference fill.
                const stops = [
                    ...style.backgroundImage.matchAll(/\s(\d+)%/g),
                ].map((stop) => Number(stop[1]) / 100);
                const start = stops[0] || 0;
                const end = stops.length > 2 ? stops.at(-1) : 1;
                return {
                    weight: style.fontWeight,
                    fill: style.backgroundColor,
                    color: style.color,
                    display: style.display,
                    decoration: style.boxDecorationBreak,
                    padding: [
                        parseFloat(style.paddingTop),
                        parseFloat(style.paddingRight),
                        parseFloat(style.paddingBottom),
                        parseFloat(style.paddingLeft),
                    ],
                    fragments: [...element.getClientRects()].map((rect) => ({
                        top: rect.top + rect.height * start,
                        bottom: rect.top + rect.height * end,
                        height: rect.height * (end - start),
                        boxTop: rect.top,
                        boxBottom: rect.bottom,
                        boxHeight: rect.height,
                    })),
                };
            };
            return {
                em: bands(".col em"),
                marker: bands(".marker"),
                mark: bands("mark"),
                strong: getComputedStyle(section.querySelector("strong"))
                    .fontWeight,
                color: getComputedStyle(section).color,
            };
        }),
    );
    for (const value of values) {
        const reference = value.em.fragments[0];
        expect(reference.height).toBeCloseTo(reference.boxHeight * 0.3, 1);
        expect(value.marker.fragments[0].height).toBeCloseTo(
            reference.height,
            1,
        );
        expect(value.mark.fragments.length).toBeGreaterThanOrEqual(2);
        for (const fragment of value.mark.fragments) {
            expect(fragment.height).toBeCloseTo(fragment.boxHeight * 0.8, 1);
            expect(fragment.top - fragment.boxTop).toBeCloseTo(
                fragment.boxHeight * 0.1,
                1,
            );
            expect(fragment.boxBottom - fragment.bottom).toBeCloseTo(
                fragment.boxHeight * 0.1,
                1,
            );
        }
        for (let index = 1; index < value.mark.fragments.length; index++) {
            expect(
                value.mark.fragments[index].top -
                    value.mark.fragments[index - 1].bottom,
            ).toBeGreaterThan(0);
        }
        for (const marker of [value.em, value.marker, value.mark]) {
            expect(marker.weight).toBe("400");
            expect(marker.fill).toBe("rgba(0, 0, 0, 0)");
            expect(marker.color).toBe(value.color);
            expect(marker.decoration).toBe("clone");
        }
        expect(value.mark.display).toBe("inline");
        expect(value.mark.padding[0]).toBe(0);
        expect(value.mark.padding[2]).toBe(0);
        expect(value.mark.padding[1]).toBeCloseTo(2.08, 2);
        expect(value.mark.padding[3]).toBeCloseTo(2.08, 2);
        expect(value.strong).toBe("700");
    }
});

test("lab marker changes preserve authored paint and the other surfaces", async ({
    page,
}) => {
    for (const [theme, paper] of [
        ["lab", true],
        ["muji", false],
        ["toshiba", false],
    ]) {
        const value = await render(page, { theme, paper });
        expect(value.emphasis.background).toContain("70%");
        expect(value.marker.background).toContain("60%");
        expect(value.mark.background).toBe("none");
        expect(value.mark.fill).not.toBe("rgba(0, 0, 0, 0)");
    }
    const inherited = await render(page, {
        style: "section p { color: rgb(35, 70, 100); }",
    });
    expect(inherited.mark.color).toBe("rgb(35, 70, 100)");
    const overridden = await render(page, {
        style: "em { background: rgb(20, 60, 90); } section .marker { background: rgb(20, 60, 90); } mark { background: rgb(20, 60, 90); color: rgb(255, 255, 255); }",
    });
    for (const marker of [
        overridden.emphasis,
        overridden.marker,
        overridden.mark,
    ]) {
        expect(marker.background).toBe("none");
        expect(marker.fill).toBe("rgb(20, 60, 90)");
    }
    expect(overridden.mark.color).toBe("rgb(255, 255, 255)");
    expect(overridden.strong.weight).toBe("700");
});

test("plain lab preserves deck overrides and the independent paper and other-theme scales", async ({
    page,
}) => {
    const paper = await render(page, { paper: true });
    expect(paper.body.size).toBe(10);
    expect(paper.body.leading).toBe(15);
    expect(paper.strong.weight).toBe("500");
    expect(paper.caption.size).toBe(7);
    expect(paper.footnote.size).toBe(4);
    for (const [theme, bodySize, strongWeight] of [
        ["muji", 24, "500"],
        ["toshiba", 26, "700"],
    ]) {
        const value = await render(page, { theme });
        expect(value.body.size).toBe(bodySize);
        expect(value.strong.weight).toBe(strongWeight);
        expect(value.caption.size).toBeCloseTo(bodySize * 0.6, 1);
        expect(value.footnote.size).toBeCloseTo(bodySize * 0.4, 1);
    }
    await render(page, {
        style: "section { --font-body: serif; font-size: 28px; line-height: 1.6; } section h2 { font-size: 44px; } section figcaption { font-size: 21px; } section .footnote { font-size: 16px; }",
    });
    await expect(page.locator("h2")).toHaveCSS("font-size", "44px");
    await expect(page.locator("section")).toHaveCSS("font-family", "serif");
    await expect(page.locator("section")).toHaveCSS("font-size", "28px");
    await expect(page.locator("section")).toHaveCSS("line-height", "44.8px");
    await expect(page.locator("figcaption")).toHaveCSS("font-size", "21px");
    await expect(page.locator(".footnote")).toHaveCSS("font-size", "16px");
});

for (const size of ["16:9", "4:3"]) {
    test(`plain lab ${size}: body reserves larger captions and preserves figure groups`, async ({
        page,
    }) => {
        const artwork = fs.readFileSync(
            path.join(__dirname, "../../fixtures/body-layout-media.svg"),
            "utf8",
        );
        const source = fs
            .readFileSync(
                path.join(__dirname, "../../fixtures/body-layout-slide.md"),
                "utf8",
            )
            .replace("size: 16:9", `size: ${size}`)
            .replaceAll(
                "body-layout-media.svg",
                `data:image/svg+xml,${encodeURIComponent(artwork)}`,
            );
        await mount(page, source);
        await page
            .locator("img")
            .evaluateAll((images) =>
                Promise.all(images.map((image) => image.decode())),
            );
        const layouts = await page.locator("section").evaluateAll((sections) =>
            sections.map((section) => {
                const body = section
                    .querySelector(".body")
                    .getBoundingClientRect();
                const heading = section
                    .querySelector("h2")
                    .getBoundingClientRect();
                const footer = section
                    .querySelector("footer")
                    .getBoundingClientRect();
                const rect = (element) => {
                    const { top, bottom, width, height } =
                        element.getBoundingClientRect();
                    return { top, bottom, width, height };
                };
                return {
                    topClearance: body.top - heading.bottom,
                    bottomClearance: footer.top - body.bottom,
                    figures: [...section.querySelectorAll("figure")].map(
                        (figure) => ({
                            figure: rect(figure),
                            media: rect(figure.querySelector("img")),
                            caption: rect(figure.querySelector("figcaption")),
                            captionSize: parseFloat(
                                getComputedStyle(
                                    figure.querySelector("figcaption"),
                                ).fontSize,
                            ),
                            availableBottom: body.bottom,
                        }),
                    ),
                };
            }),
        );
        expect(layouts).toHaveLength(4);
        for (const layout of layouts) {
            expect(layout.topClearance).toBeGreaterThanOrEqual(-1);
            expect(layout.bottomClearance).toBeGreaterThan(0);
            for (const figure of layout.figures) {
                expect(figure.media.height).toBeGreaterThan(20);
                expect(figure.media.bottom).toBeLessThan(figure.caption.top);
                expect(figure.caption.bottom).toBeLessThanOrEqual(
                    figure.figure.bottom + 1,
                );
                expect(figure.figure.bottom).toBeLessThanOrEqual(
                    figure.availableBottom + 1,
                );
                expect(figure.captionSize).toBe(19.5);
            }
        }
    });
}
