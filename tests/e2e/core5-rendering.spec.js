const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createConfiguredMarp } = require("../../src/slide-map");
const { auditSlidesInPage, renderToHtml } = require("../../src/visual-overflow");

test("BOM frontmatter keeps the rendered validator canvas and readability floors at 4:3", async ({ page }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-bom-canvas-"));
    try {
        await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
        for (const prefix of ["", "\uFEFF"]) {
            const deckPath = path.join(dir, "slide.md");
            fs.writeFileSync(deckPath, `${prefix}---\nmarp: true\ntheme: lab\nsize: 4:3\n---\n# Canvas\n`);
            const rendered = renderToHtml(deckPath);
            try {
                await page.goto(pathToFileURL(rendered.htmlPath).href);
                const [audit] = await page.evaluate(auditSlidesInPage, {
                    tolerancePx: 2,
                    overlapTolerancePx: 2,
                    mediaToleranceRatio: 0.02,
                    safeMarginPx: 20,
                    referenceHeightPx: 720,
                    bodyFloorPx: 12,
                    secondaryFloorPx: 8,
                    referenceWidthPx: 1280,
                });
                expect([audit.width, audit.height]).toEqual([1024, 768]);
                expect(audit.safeMarginPx).toBe(21);
                expect(audit.textFloorPx.body).toBeCloseTo(9.6);
            } finally {
                fs.rmSync(rendered.tempRoot, { recursive: true, force: true });
            }
        }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

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
        ["github-light invert", palette.light],
    ]) {
        test(`${theme} ${className}: both Mermaid renderers follow theme colors and sizing`, async ({
            page,
        }) => {
            const marp = createConfiguredMarp();
            marp.themeSet.add(
                fs.readFileSync(
                    path.join(__dirname, `../../themes/${theme}.css`),
                    "utf8",
                ),
            );
            const diagrams = ["mermaid", "mermaid interactive"]
                .map(
                    (info) => `
<div style="--mermaid-width: 240px; --mermaid-max-width: none; --mermaid-max-height: 180px">

\`\`\`${info}
flowchart LR
A[Input] --> B[Output]
\`\`\`

</div>`,
                )
                .join("\n\n");
            const { html, css } = marp.render(
                `---\ntheme: ${theme}\nclass: ${className}\n---\n${diagrams}`,
            );
            await page.route("https://fonts.googleapis.com/**", (route) =>
                route.abort(),
            );
            await page.setContent(`<style>${css}</style>${html}`);
            const svgs = page.locator(".mermaid-diagram > svg");
            await expect(svgs).toHaveCount(2);
            const foreground = await page
                .locator("section")
                .evaluate((element) => getComputedStyle(element).color);
            for (const svg of await svgs.all()) {
                await expect(svg.locator("text").first()).toHaveCSS(
                    "fill",
                    foreground,
                );
                await expect(svg).toHaveCSS("width", "240px");
                await expect(svg).toHaveCSS("max-height", "180px");
            }
            // A cached SVG must pick up theme overrides without being rendered again.
            await page.locator("section").evaluate((element) => {
                element.style.setProperty(
                    "--marp-mermaid-foreground",
                    "#123456",
                );
                element.style.setProperty("--marp-mermaid-line", "#654321");
            });
            for (const svg of await svgs.all()) {
                await expect(svg.locator("text").first()).toHaveCSS(
                    "fill",
                    "rgb(18, 52, 86)",
                );
                await expect(svg.locator(".edge").first()).toHaveCSS(
                    "stroke",
                    "rgb(101, 67, 33)",
                );
            }
        });

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
