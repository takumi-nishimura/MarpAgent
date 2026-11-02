const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { createConfiguredMarp } = require("../../src/slide-map");
for (const theme of ["lab", "muji", "toshiba"]) {
    test(`${theme}: automatic body frees header space and keeps branding clear`, async ({
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
paginate: true
footer: Source and conditions
style: |
  section { --logos-dark: linear-gradient(black, black); }
---
## Page title

Text and supporting evidence.

- First point
- Second point

---
<!-- _header: Context -->

## Page title

Text and supporting evidence.
`);
        await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
        await page.setContent(
            `<style>body { margin: 0; } ${css}</style>${html}`,
        );
        const layout = await page.locator("section").evaluateAll((slides) =>
            slides.map((s) => {
                const top = s.getBoundingClientRect().top;
                const rect = (selector) => {
                    const r = s.querySelector(selector).getBoundingClientRect();
                    return {
                        top: r.top - top,
                        bottom: r.bottom - top,
                        left: r.left,
                        right: r.right,
                    };
                };
                return {
                    heading: rect("h2"),
                    header: s.querySelector("header") ? rect("header") : null,
                    headerFont: s.querySelector("header") ? getComputedStyle(s.querySelector("header")).fontSize : null,
                    headerLeft: s.querySelector("header") ? s.querySelector("header").getBoundingClientRect().left + parseFloat(getComputedStyle(s.querySelector("header")).paddingLeft) : null,
                    body: rect(".body"),
                    footer: rect("footer"),
                    logo: s.querySelector(".slide-logos")
                        ? rect(".slide-logos")
                        : null,
                };
            }),
        );
        expect(layout[0].heading.top).toBeLessThan(layout[1].heading.top - 20);
        expect(layout[0].body.top).toBeGreaterThan(layout[0].heading.bottom);
        expect(layout[0].body.bottom).toBeLessThanOrEqual(layout[0].logo.top);
        expect(layout[0].footer.right).toBeLessThan(layout[0].logo.left);
        expect(layout[1].logo).toBeNull();
        expect(layout[1].header.bottom - layout[1].header.top).toBe(52);
        expect(layout[1].headerFont).toBe("26px");
        expect(layout[1].heading.left - layout[1].headerLeft).toBe(16);
        expect(
            await page.locator("section").first().locator("header").count(),
        ).toBe(0);
        if (theme === "lab")
            await page
                .locator("section")
                .first()
                .screenshot({ path: "/tmp/marpagent-auto-body.png" });
    });
}
