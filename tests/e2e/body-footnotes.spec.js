const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { createConfiguredMarp } = require("../../src/slide-map");
const { auditSlidesInPage } = require("../../src/visual-overflow");

const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="280"><rect width="640" height="280" fill="steelblue"/></svg>')}`;
const note = "Source: fictional data; no measured results.<br>Conditions: the same input for both values.<br>Limit: do not generalize to another setting.<br>All qualifications remain visible.";

async function render(page, { theme = "lab", size = "16:9", heading = "Evidence", caption = "Source and condition", reserve = "", noteFirst = false, kind = "body" } = {}) {
    const marp = createConfiguredMarp();
    marp.themeSet.add(fs.readFileSync(path.join(__dirname, `../../themes/${theme}.css`), "utf8"));
    const footnote = `<div class="footnote">${note}</div>`;
    const markdown = `---
theme: ${theme}
size: ${size}
paginate: true
header: Footnote contract
${kind === "title" ? "class: title\n" : ""}---
${kind === "scroll" ? "<!-- _scroll: true -->" : ""}
${kind === "paper" ? '<div class="paper-header">Paper header</div>' : ""}
<h2>${heading}</h2>
${noteFirst ? footnote : ""}
<div class="${kind === "legacy" ? "box fill" : "body"}" ${reserve ? `style="--body-bottom-safe: ${reserve}"` : ""}>
<figure><img src="${image}" alt="Fictional comparison"/><figcaption>${caption}</figcaption></figure>
<p>A required qualification.</p>
</div>
${noteFirst ? "" : footnote}`;
    const { html, css } = marp.render(markdown);
    await page.route(/^https?:\/\//, (route) => route.abort());
    await page.setContent(`<style>body{margin:0}${css}</style>${html}`);
    await page.locator("img").evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
    await settle(page);
}

async function settle(page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
}

async function layout(page) {
    return page.locator("section").evaluate((section) => {
        const slide = section.getBoundingClientRect();
        const rect = (element) => {
            const r = element.getBoundingClientRect();
            return { top: r.top - slide.top, bottom: r.bottom - slide.top, left: r.left - slide.left, width: r.width, height: r.height };
        };
        const body = section.querySelector(".body, .box.fill");
        const footnote = section.querySelector(".footnote");
        return {
            slide: rect(section), body: rect(body), footnote: rect(footnote), media: rect(section.querySelector("img")), caption: rect(section.querySelector("figcaption")),
            footnoteStyle: ["position", "fontSize", "lineHeight", "left", "right", "bottom"].map((key) => getComputedStyle(footnote)[key]),
            bodyFont: getComputedStyle(body).fontSize,
            captionFont: getComputedStyle(section.querySelector("figcaption")).fontSize,
            text: section.textContent.replace(/\s+/g, " ").trim(),
            page: section.getAttribute("data-marpit-pagination"),
            order: [...section.children].filter((el) => !["STYLE", "SCRIPT"].includes(el.tagName)).map((el) => el.className || el.tagName),
            measuredReserve: body.style.getPropertyValue("--marpagent-body-bottom-reserve"),
            overflow: getComputedStyle(body).overflowY,
        };
    });
}

for (const theme of ["lab", "muji", "toshiba"]) {
    for (const size of ["16:9", "4:3"]) {
        test(`${theme} ${size}: direct footnotes reserve their actual height through heading and caption growth`, async ({ page }) => {
            const layouts = [];
            for (const growth of [{}, { heading: "Evidence<br>Another heading line" }, { caption: "Source and condition<br>Another caption line" }]) {
                await render(page, { theme, size, ...growth });
                const box = await layout(page);
                expect(box.body.bottom).toBeLessThan(box.footnote.top - 1);
                expect(box.media.height).toBeGreaterThan(50);
                expect(box.media.bottom).toBeLessThan(box.caption.top);
                expect(box.caption.bottom).toBeLessThan(box.body.bottom);
                expect(box.footnote.bottom).toBeLessThan(box.slide.height);
                expect(box.footnoteStyle[0]).toBe("absolute");
                expect(box.page).toBe("1");
                expect(box.overflow).toBe("visible");
                layouts.push(box);
            }
            expect(layouts[1].media.height).toBeLessThan(layouts[0].media.height);
            expect(layouts[2].media.height).toBeLessThan(layouts[0].media.height);
            for (const box of layouts.slice(1)) {
                expect(box.footnote).toEqual(layouts[0].footnote);
                expect(box.footnoteStyle).toEqual(layouts[0].footnoteStyle);
                expect(box.bodyFont).toBe(layouts[0].bodyFont);
                expect(box.captionFont).toBe(layouts[0].captionFont);
            }
        });
    }

    test(`${theme}: source order, explicit reserve, late footnote growth, and print keep the contract`, async ({ page }) => {
        await render(page, { theme, reserve: "120px", noteFirst: true });
        const before = await layout(page);
        expect(before.body.bottom).toBeCloseTo(before.slide.height - 120, 1);
        expect(before.order.indexOf("footnote")).toBeLessThan(before.order.indexOf("body"));
        await page.locator(".footnote").evaluate((element) => {
            element.innerHTML += "<br>Additional source detail.".repeat(8);
        });
        await settle(page);
        const grown = await layout(page);
        expect(grown.body.bottom).toBeLessThan(grown.footnote.top - 1);
        expect(grown.body.height).toBeLessThan(before.body.height);
        expect(grown.order).toEqual(before.order);
        expect(grown.footnoteStyle).toEqual(before.footnoteStyle);
        await page.emulateMedia({ media: "print" });
        await settle(page);
        const printed = await layout(page);
        expect(printed.body.bottom).toBeLessThan(printed.footnote.top - 1);
        expect(printed.footnoteStyle).toEqual(before.footnoteStyle);
        expect(printed.page).toBe(before.page);
        expect(printed.overflow).toBe("visible");
    });

    test(`${theme}: natural figures and explicit crop dimensions remain authored`, async ({ page }) => {
        await render(page, { theme });
        await page.locator("figure").evaluate((figure) => {
            figure.classList.add("figure-natural");
            figure.querySelector("img").style.cssText = "width:320px;height:180px;flex:none;object-fit:cover";
        });
        await settle(page);
        const before = await layout(page);
        expect(before.media.width).toBeCloseTo(320, 1);
        expect(before.media.height).toBeCloseTo(180, 1);
        await page.locator(".footnote").evaluate((note) => { note.innerHTML += "<br>Required source details.".repeat(3); });
        await settle(page);
        const after = await layout(page);
        expect(after.body.bottom).toBeLessThan(after.footnote.top - 1);
        expect(after.media.width).toBe(before.media.width);
        expect(after.media.height).toBe(before.media.height);
        await expect(page.locator("img")).toHaveCSS("object-fit", "cover");
        await expect(page.locator("figure")).toHaveClass("figure-natural");
    });
}

test("scaled and temporarily hidden slides recalculate added and removed direct notes", async ({ page }) => {
    await render(page);
    const initial = await layout(page);
    await page.locator("section").evaluate((section) => { section.style.cssText = "transform:scale(.5);transform-origin:top left"; });
    await settle(page);
    expect((await layout(page)).body.bottom * 2).toBeCloseTo(initial.body.bottom, 1);
    await page.locator(".footnote").evaluate((note) => { window.savedNote = note; note.remove(); });
    await settle(page);
    await expect(page.locator(".body")).toHaveCSS("margin-bottom", "48px");
    await page.locator("section").evaluate((section) => { section.style.display = "none"; section.append(window.savedNote); });
    await settle(page);
    await page.locator("section").evaluate((section) => { section.style.display = ""; });
    await settle(page);
    const restored = await layout(page);
    expect(restored.body.bottom * 2).toBeCloseTo(initial.body.bottom, 1);
    expect(restored.body.bottom).toBeLessThan(restored.footnote.top - 1);
});

test("legacy, title, paper, and scroll keep their footnote mechanisms", async ({ page }) => {
    for (const kind of ["legacy", "title", "paper", "scroll"]) {
        await render(page, { kind, size: kind === "paper" ? "a4" : "16:9" });
        const box = await layout(page);
        expect(box.measuredReserve).toBe("");
        expect(box.footnoteStyle[0]).toBe("absolute");
    }
});

test("excessive required text stays visible to diagnostics with a direct footnote", async ({ page }) => {
    await render(page);
    await page.locator(".body > p").evaluate((element) => { element.innerHTML = "Required qualification.<br>".repeat(40); });
    await settle(page);
    const [audit] = await page.evaluate(auditSlidesInPage, { tolerancePx: 2, overlapTolerancePx: 2, mediaToleranceRatio: 0.02, safeMarginPx: 20, referenceWidthPx: 1280, referenceHeightPx: 720, bodyFloorPx: 12, secondaryFloorPx: 8 });
    expect(audit.clipped.length + audit.overlaps.length).toBeGreaterThan(0);
    expect(audit.smallText).toHaveLength(0);
    expect((await layout(page)).overflow).toBe("visible");
});
