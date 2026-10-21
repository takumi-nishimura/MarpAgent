const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { createConfiguredMarp } = require("../../src/slide-map");
const { auditSlidesInPage } = require("../../src/visual-overflow");
const baselines = require("../../fixtures/layout-baselines/cases.json");

const auditOptions = {
    tolerancePx: 2,
    overlapTolerancePx: 2,
    mediaToleranceRatio: 0.02,
    safeMarginPx: 20,
    referenceHeightPx: 720,
    referenceWidthPx: 1280,
    bodyFloorPx: 12,
    secondaryFloorPx: 8,
};

async function render(page, markdown, theme, completeDocument = false) {
    const marp = createConfiguredMarp();
    marp.themeSet.add(
        fs.readFileSync(
            path.join(__dirname, `../../themes/${theme}.css`),
            "utf8",
        ),
    );
    const { html, css } = marp.render(
        completeDocument
            ? markdown.replace(/^theme: lab$/m, `theme: ${theme}`)
            : `---\ntheme: ${theme}\n---\n${markdown}`,
    );
    await page.route("https://fonts.googleapis.com/**", (route) =>
        route.abort(),
    );
    await page.setContent(`<style>body { margin: 0; } ${css}</style>${html}`);
    await page.evaluate(() => document.fonts.ready);
}

function baselineMarkdown() {
    const deckPath = path.resolve(__dirname, "../..", baselines.deck);
    // Embed only this fixture's local SVGs so setContent uses the same media
    // without needing a server or file:// access from about:blank.
    return fs
        .readFileSync(deckPath, "utf8")
        .replace(
            /src="(assets\/img\/[^\"]+\.svg)"/g,
            (_, asset) =>
                `src="data:image/svg+xml;base64,${fs.readFileSync(path.join(path.dirname(deckPath), asset)).toString("base64")}"`,
        );
}

async function platformFonts(page, selector) {
    const session = await page.context().newCDPSession(page);
    try {
        await session.send("DOM.enable");
        await session.send("CSS.enable");
        const { root } = await session.send("DOM.getDocument");
        const { nodeId } = await session.send("DOM.querySelector", {
            nodeId: root.nodeId,
            selector,
        });
        const { fonts } = await session.send("CSS.getPlatformFontsForNode", {
            nodeId,
        });
        return fonts;
    } finally {
        await session.detach();
    }
}

for (const theme of ["lab", "muji", "toshiba"]) {
    test(`${theme}: representative baseline keeps evidence and composition`, async ({
        page,
        browser,
    }, testInfo) => {
        await render(page, baselineMarkdown(), theme, true);
        const sections = page.locator(
            "svg[data-marpit-svg] > foreignObject > section",
        );
        const at = (pair, boundary = false) => {
            const entry = baselines.pairs.find(({ id }) => id === pair);
            return sections.nth(entry.slides[boundary ? 1 : 0] - 1);
        };
        const text = async (locator) =>
            (await locator.textContent()).replaceAll("\u200b", "");

        await expect(sections).toHaveCount(baselines.pairs.length * 2);
        await expect(sections.locator("h2")).toHaveCount(14);
        await expect(sections.locator("img")).toHaveCount(10);
        await expect(sections.locator("figcaption")).toHaveCount(10);
        for (const image of await sections.locator("img").all()) {
            await expect(image).toBeVisible();
            await expect
                .poll(() =>
                    image.evaluate(
                        (node) =>
                            node.complete &&
                            node.naturalWidth > 0 &&
                            node.naturalHeight > 0,
                    ),
                )
                .toBe(true);
        }

        for (const boundary of [false, true]) {
            expect(await text(at("body", boundary).locator("strong"))).toBe(
                "比較条件を保つ",
            );
            expect(await text(at("columns", boundary).locator("strong"))).toBe(
                "同じ入力条件",
            );
            expect(await text(at("results", boundary).locator("mark"))).toBe(
                "入力条件は共通",
            );
            expect(
                await text(at("results", boundary).locator(".footnote")),
            ).toContain("実測値ではない");
            const emphasis = await at("columns", boundary).evaluate(
                (section) => ({
                    text: getComputedStyle(section.querySelector("strong"))
                        .color,
                    body: getComputedStyle(section).color,
                    weight: Number(
                        getComputedStyle(section.querySelector("strong"))
                            .fontWeight,
                    ),
                    bodyWeight: Number(getComputedStyle(section).fontWeight),
                }),
            );
            // Toshiba keeps bold emphasis monochrome; lab/muji also use color.
            expect(
                emphasis.text !== emphasis.body ||
                    emphasis.weight > emphasis.bodyWeight,
            ).toBe(true);
            const marker = at("results", boundary).locator("mark");
            await expect(marker).toBeVisible();
            expect(
                await marker.evaluate(
                    (node) => getComputedStyle(node).backgroundColor,
                ),
            ).not.toBe("rgba(0, 0, 0, 0)");
            await expect(
                at("diagram", boundary).locator(".mermaid-diagram > svg"),
            ).toHaveCount(1);
            await expect(
                at("diagram", boundary).locator("mjx-container, .katex"),
            ).toHaveCount(2);

            const columns = await at("columns", boundary).evaluate(
                (section) => {
                    const evidence = section.querySelector(
                        '[data-region="evidence"]',
                    );
                    const interpretation = section.querySelector(
                        '[data-region="interpretation"]',
                    );
                    const a = evidence.getBoundingClientRect();
                    const b = interpretation.getBoundingClientRect();
                    const gap = parseFloat(
                        getComputedStyle(evidence.parentElement).columnGap,
                    );
                    return {
                        ratio: (a.width + gap) / (b.width + gap),
                        aTop: a.top,
                        bTop: b.top,
                        aRight: a.right,
                        bLeft: b.left,
                        gap,
                    };
                },
            );
            expect(columns.ratio).toBeCloseTo(2, 2);
            expect(columns.aTop).toBeCloseTo(columns.bTop, 1);
            expect(columns.bLeft - columns.aRight).toBeCloseTo(columns.gap, 1);

            const stack = await at("stack", boundary)
                .locator("figure")
                .evaluateAll((figures) =>
                    figures.map((figure) => {
                        const rect = figure.getBoundingClientRect();
                        return { top: rect.top, bottom: rect.bottom };
                    }),
                );
            expect(stack).toHaveLength(2);
            expect(stack[1].top).toBeGreaterThanOrEqual(stack[0].bottom);
        }
        expect(
            await at("columns", true)
                .locator("img")
                .evaluate((image) => image.naturalHeight > image.naturalWidth),
        ).toBe(true);
        await expect(at("table").locator("tbody tr")).toHaveCount(4);
        await expect(at("table", true).locator("tbody tr")).toHaveCount(5);

        // Findings remain observations: the scaffold deliberately preserves
        // current defaults, including any existing boundary defects.
        const audits = await page.evaluate(auditSlidesInPage, auditOptions);
        const ids = baselines.pairs.flatMap(({ standard, boundary }) => [
            standard,
            boundary,
        ]);
        for (const [index, id] of ids.entries()) {
            await sections
                .nth(index)
                .screenshot({ path: testInfo.outputPath(`${id}.png`) });
        }
        // These bounded trials record the cost and effect of existing sizing
        // controls. Their findings are observations, not a required design.
        const trials = [];
        const portrait = at("columns", true).locator("img");
        for (const trial of [
            { name: "utility", attribute: "class", value: "max-h-full" },
            { name: "inline", attribute: "style", value: "max-height: 480px;" },
        ]) {
            const previous = await portrait.getAttribute(trial.attribute);
            await portrait.evaluate(
                (node, { attribute, value }) =>
                    node.setAttribute(attribute, value),
                trial,
            );
            const measured = await page.evaluate(
                auditSlidesInPage,
                auditOptions,
            );
            const screenshot = `trial-${trial.name}-portrait.png`;
            await at("columns", true).screenshot({
                path: testInfo.outputPath(screenshot),
            });
            trials.push({
                ...trial,
                screenshot,
                case: "columns-portrait",
                audit: measured[5],
                neighborAudits: [4, 6].map((index) => ({
                    case: ids[index],
                    ...measured[index],
                })),
                imageBox: await portrait.evaluate((node) => ({
                    width: node.getBoundingClientRect().width,
                    height: node.getBoundingClientRect().height,
                    naturalWidth: node.naturalWidth,
                    naturalHeight: node.naturalHeight,
                })),
            });
            await portrait.evaluate(
                (node, { attribute, previous }) => {
                    if (previous === null) node.removeAttribute(attribute);
                    else node.setAttribute(attribute, previous);
                },
                { attribute: trial.attribute, previous },
            );
        }
        const observations = {
            theme,
            browser: browser.version(),
            viewport: page.viewportSize(),
            dpr: await page.evaluate(() => devicePixelRatio),
            fontPolicy:
                "Google Fonts blocked; actual platform fonts recorded below",
            screenshots: ids.map((id) => `${id}.png`),
            headingFonts: await platformFonts(page, "section h2"),
            bodyFonts: await platformFonts(page, "section > p"),
            trials,
            audits: audits.map((audit, index) => ({
                case: ids[index],
                ...audit,
            })),
        };
        const observationPath = testInfo.outputPath(
            "baseline-observations.json",
        );
        fs.writeFileSync(
            observationPath,
            JSON.stringify(observations, null, 2) + "\n",
        );
        await testInfo.attach("baseline-observations.json", {
            path: observationPath,
            contentType: "application/json",
        });
    });

    test(`${theme}: utilities compose unequal columns without adding card styling`, async ({
        page,
    }) => {
        await render(
            page,
            `
## Evidence and interpretation

<div id="layout" class="grid grid-cols-12 gap-6 items-start">
<div id="evidence" class="col-span-8 min-w-0">

| Format | Editable | Delivery |
| :----- | -------: | -------: |
| Markdown | 12 | 240 |
| PDF | 3 | 42 |

</div>
<div id="interpretation" class="col-span-4 min-w-0">

The table carries the detail. This column explains the decision.

</div>
</div>
`,
            theme,
        );

        const layout = await page.evaluate(() => {
            const container = document.querySelector("#layout");
            const evidence = document.querySelector("#evidence");
            const interpretation = document.querySelector("#interpretation");
            const box = (element) => {
                const { left, right, top, width } =
                    element.getBoundingClientRect();
                return { left, right, top, width };
            };
            const appearance = (element) => {
                const style = getComputedStyle(element);
                return {
                    background: style.backgroundColor,
                    border: style.borderTopWidth,
                };
            };
            return {
                container: box(container),
                evidence: box(evidence),
                interpretation: box(interpretation),
                gap: parseFloat(getComputedStyle(container).columnGap),
                appearance: [container, evidence, interpretation].map(
                    appearance,
                ),
                numericAlignment: getComputedStyle(
                    document.querySelector("td:last-child"),
                ).textAlign,
            };
        });
        // Spans include their internal gaps: adding one gap makes an 8:4 ratio.
        expect(
            (layout.evidence.width + layout.gap) /
                (layout.interpretation.width + layout.gap),
        ).toBeCloseTo(2, 2);
        expect(layout.gap).toBeGreaterThan(0);
        expect(layout.interpretation.left - layout.evidence.right).toBeCloseTo(
            layout.gap,
            1,
        );
        expect(layout.evidence.top).toBeCloseTo(layout.interpretation.top, 1);
        expect(layout.interpretation.right).toBeCloseTo(
            layout.container.right,
            1,
        );
        expect(layout.numericAlignment).toBe("right");
        for (const appearance of layout.appearance) {
            expect(appearance.background).toBe("rgba(0, 0, 0, 0)");
            expect(appearance.border).toBe("0px");
        }
    });

    test(`${theme}: flex rows size and align plain wrappers`, async ({
        page,
    }) => {
        await render(
            page,
            `
## A shared reading order

<div id="row" class="flex gap-4 items-center">
<div id="label" class="shrink-0">Owner</div>
<div id="detail" class="flex-1 min-w-0">
<div>Responsible team</div>
<div>Required deliverable and review conditions</div>
</div>
</div>
`,
            theme,
        );
        const layout = await page.evaluate(() => {
            const rect = (id) => {
                const { left, right, top, bottom, width } = document
                    .getElementById(id)
                    .getBoundingClientRect();
                return { left, right, width, centerY: (top + bottom) / 2 };
            };
            return {
                row: rect("row"),
                label: rect("label"),
                detail: rect("detail"),
            };
        });
        expect(layout.detail.left).toBeGreaterThan(layout.label.right);
        expect(layout.detail.width).toBeGreaterThan(layout.label.width);
        expect(layout.label.centerY).toBeCloseTo(layout.detail.centerY, 1);
        expect(layout.detail.right).toBeCloseTo(layout.row.right, 1);
    });
}
