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
                decoration: value.boxDecorationBreak,
            };
        };
        return {
            body: style("section"),
            heading: style("h2"),
            strong: style("strong"),
            emphasis: style("em"),
            marker: style(".marker"),
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
    for (const scheme of [
        "invert",
        "dracula",
        "one-dark",
        "nord",
        "neogaia",
        "neogaia invert",
        "github-light",
    ]) {
        const value = await render(page, { classes: scheme });
        expect(value.strong.weight).toBe("700");
        expect(value.strong.color).not.toBe(value.body.color);
        expect(value.emphasis.background).toContain("linear-gradient");
        expect(value.table.color).toBe(value.body.color);
    }
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
