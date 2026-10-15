const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { createConfiguredMarp } = require("../../src/slide-map");

const palettes = {
    lab: { light: "rgb(215, 58, 73)", dark: "rgb(198, 120, 221)" },
    muji: { light: "rgb(127, 0, 25)", dark: "rgb(224, 206, 170)" },
    toshiba: { light: "rgb(230, 30, 30)", dark: "rgb(198, 120, 221)" },
};

for (const [theme, palette] of Object.entries(palettes)) {
    test(`${theme}: MathJax inline math stays within its text line`, async ({
        page,
    }) => {
        const marp = createConfiguredMarp();
        marp.themeSet.add(
            fs.readFileSync(
                path.join(__dirname, `../../themes/${theme}.css`),
                "utf8",
            ),
        );
        const { html, css } = marp.render(`---
theme: ${theme}
math: mathjax
---
Before $x^2$ after.
`);
        await page.route("https://fonts.googleapis.com/**", (route) =>
            route.abort(),
        );
        await page.setContent(`<style>${css}</style>${html}`);
        const paragraph = page.locator("section > p");
        const metrics = await paragraph.evaluate((element) => ({
            height: element.getBoundingClientRect().height,
            fontSize: parseFloat(getComputedStyle(element).fontSize),
        }));
        expect(metrics.height).toBeLessThan(metrics.fontSize * 1.7);
    });

    for (const [className, color] of [
        ["normal", palette.light],
        ["invert", palette.dark],
        ["neogaia invert", palette.light],
    ]) {
        test(`${theme} ${className}: Shiki retains the theme's code palette`, async ({
            page,
        }) => {
            const marp = createConfiguredMarp();
            marp.themeSet.add(
                fs.readFileSync(
                    path.join(__dirname, `../../themes/${theme}.css`),
                    "utf8",
                ),
            );
            const { html, css } = marp.render(`---
theme: ${theme}
class: ${className}
---
## Code

\`\`\`js {1}
const value = 42;
\`\`\`
`);
            await page.route("https://fonts.googleapis.com/**", (route) =>
                route.abort(),
            );
            await page.setContent(`<style>${css}</style>${html}`);
            const keyword = page.locator(".marp-shiki .line span").first();
            await expect(keyword).toHaveCSS("color", color);
            await expect(page.locator(".line.highlighted")).not.toHaveCSS(
                "background-color",
                "rgba(0, 0, 0, 0)",
            );
        });
    }
}
