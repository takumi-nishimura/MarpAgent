const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { Marp } = require("@marp-team/marp-core");

async function render(page, markdown, theme) {
    const marp = new Marp({ html: true });
    marp.themeSet.add(
        fs.readFileSync(
            path.join(__dirname, `../../themes/${theme}.css`),
            "utf8",
        ),
    );
    const { html, css } = marp.render(`---\ntheme: ${theme}\n---\n${markdown}`);
    await page.route("https://fonts.googleapis.com/**", (route) =>
        route.abort(),
    );
    await page.setContent(`<style>body { margin: 0; } ${css}</style>${html}`);
}

for (const theme of ["lab", "muji", "toshiba"]) {
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
