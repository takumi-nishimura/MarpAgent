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

async function render(
    page,
    { theme = "lab", classes = "", paper = false, style = "" } = {},
) {
    const marp = config.engine({});
    marp.themeSet.add(
        fs.readFileSync(
            path.join(__dirname, `../../themes/${theme}.css`),
            "utf8",
        ),
    );
    const { html, css } = marp.render(
        `---\ntheme: ${theme}\nclass: ${classes}\nstyle: |\n  ${style}\n---\n` +
            (paper
                ? '<header class="paper-header">Paper title</header>\n\n'
                : "") +
            content,
    );
    await page.route("https://fonts.googleapis.com/**", (route) =>
        route.abort(),
    );
    await page.setContent(`<style>body { margin: 0; } ${css}</style>${html}`);
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

test("lab refinement exposes readable type roles and preserves colored emphasis", async ({
    page,
}) => {
    const legacy = await render(page);
    const refined = await render(page, { classes: "lab-refined" });
    expect(legacy.strong.weight).toBe("500");
    expect(legacy.caption.size).toBeCloseTo(15.6, 1);
    expect(legacy.footnote.size).toBeCloseTo(10.4, 1);
    expect(refined.body.size).toBe(26);
    expect(refined.body.leading).toBe(39);
    expect(refined.heading.size).toBe(39);
    expect(refined.heading.leading).toBeCloseTo(46.8, 1);
    expect(refined.strong.weight).toBe("700");
    expect(refined.strong.color).not.toBe(refined.body.color);
    expect(refined.caption.size).toBe(19.5);
    expect(refined.footnote.size).toBe(14);
    expect(refined.table.size).toBe(22.75);
    expect(refined.emphasis.background).toContain("linear-gradient");
    expect(refined.marker.background).toContain("linear-gradient");
    expect(refined.emphasis.decoration).toBe("clone");
    expect(refined.columnDisplay).toBe(legacy.columnDisplay);
});

test("lab refinement keeps invert and named-scheme emphasis colored", async ({
    page,
}) => {
    for (const scheme of [
        "invert",
        "dracula",
        "one-dark",
        "nord",
        "neogaia",
        "github-light",
    ]) {
        const value = await render(page, { classes: `lab-refined ${scheme}` });
        expect(value.strong.weight).toBe("700");
        expect(value.strong.color).not.toBe(value.body.color);
        expect(value.emphasis.background).toContain("linear-gradient");
        expect(value.table.color).toBe(value.body.color);
    }
});

test("lab refinement preserves deck overrides and leaves paper and other themes unchanged", async ({
    page,
}) => {
    const legacyPaper = await render(page, { paper: true });
    const refinedPaper = await render(page, {
        classes: "lab-refined",
        paper: true,
    });
    expect(refinedPaper).toEqual(legacyPaper);
    for (const theme of ["muji", "toshiba"]) {
        const legacy = await render(page, { theme });
        const refined = await render(page, { theme, classes: "lab-refined" });
        expect(refined).toEqual(legacy);
    }
    await render(page, {
        classes: "lab-refined",
        style: "section { --font-body: serif; } section h2 { font-size: 44px; }",
    });
    await expect(page.locator("h2")).toHaveCSS("font-size", "44px");
    await expect(page.locator("section")).toHaveCSS("font-family", "serif");
});
