const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const { createConfiguredMarp } = require("../../src/slide-map");

const root = path.resolve(__dirname, "../..");
const active = ".bespoke-marp-active section";
const bodySelector = `${active} > .marpagent-scroll-body`;
const paragraphs = Array.from(
    { length: 28 },
    (_, i) => `Paragraph ${i + 1}: reachable content.`,
).join("\n\n");
const markdown = `---
theme: lab
header: Fixed header
footer: Fixed footer
paginate: true
---
<!-- _scroll: true -->
## Fixed heading

<input id="entry" value="Text"><button id="control">Control</button>

${paragraphs}

END OF FIRST BODY

---
## Regular slide

\`\`\`html
<!-- _scroll: true -->
\`\`\`

---
<!-- _scroll: true -->
## Second scroll body

${paragraphs}

END OF SECOND BODY

---
<!-- _hide: true -->
<!-- _scroll: true -->
## Hidden
`;

let temp;
let server;
let url;
test.beforeAll(async () => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "marpagent-scroll-e2e-"));
    const source = path.join(temp, "slide.md");
    const output = path.join(temp, "deck.html");
    fs.writeFileSync(source, markdown);
    const result = spawnSync(
        process.execPath,
        [
            path.join(root, "node_modules/.bin/marp"),
            "--config",
            path.join(root, "marp.config.js"),
            "--html",
            "--output",
            output,
            source,
        ],
        { cwd: root, encoding: "utf8" },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const html = fs.readFileSync(output);
    server = http.createServer((_request, response) => {
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end(html);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${server.address().port}/deck.html`;
});
test.afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (temp) fs.rmSync(temp, { recursive: true, force: true });
});
test.beforeEach(async ({ context }) => {
    await context.route("https://fonts.googleapis.com/**", (route) =>
        route.abort(),
    );
});

async function open(page) {
    await page.goto(url);
    await expect(page.locator("body")).toHaveAttribute("data-bespoke-view", "");
    await expect(page.locator(active)).toHaveAttribute("id", "1");
}
async function scroll(page, value, selector = bodySelector) {
    await page.locator(selector).evaluate((body, fraction) => {
        body.scrollTop = fraction * (body.scrollHeight - body.clientHeight);
    }, value);
}
async function position(page, selector = bodySelector) {
    return page
        .locator(selector)
        .evaluate(
            (body) =>
                body.scrollTop /
                Math.max(1, body.scrollHeight - body.clientHeight),
        );
}
async function atPosition(page, value, selector = bodySelector) {
    await expect
        .poll(async () => Math.abs((await position(page, selector)) - value))
        .toBeLessThan(0.015);
}
async function popup(page, context) {
    const opened = context.waitForEvent("page");
    await page.keyboard.press("p");
    const presenter = await opened;
    await presenter.waitForLoadState();
    await expect(presenter.locator("body")).toHaveAttribute(
        "data-bespoke-view",
        "presenter",
    );
    await expect(presenter.locator(active)).toHaveAttribute("id", "1");
    return presenter;
}
async function blur(page) {
    await page.evaluate(() => document.activeElement?.blur());
}

test("an opted-in body that fits keeps native vertical page navigation", async ({
    page,
}) => {
    await open(page);
    await page.locator(bodySelector).evaluate((body) => {
        body.innerHTML = "<p>This content fits.</p>";
    });
    await expect
        .poll(() =>
            page
                .locator(bodySelector)
                .evaluate((body) => body.scrollHeight - body.clientHeight),
        )
        .toBe(0);
    await blur(page);
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(active)).toHaveAttribute("id", "2");
});

test("wheel and vertical keys scroll only the body; navigation and fixed chrome remain intact", async ({
    page,
}) => {
    await open(page);
    await expect(page.locator("section")).toHaveCount(3);
    await expect(
        page.locator('section[id="2"] > .marpagent-scroll-body'),
    ).toHaveCount(0);
    const fixed = await page
        .locator(`${active} > :is(header,h2,footer)`)
        .evaluateAll((elements) =>
            elements.map((element) => {
                const rect = element.getBoundingClientRect();
                return [rect.x, rect.y, rect.width, rect.height];
            }),
        );
    await page.locator(bodySelector).hover();
    await page.mouse.wheel(0, 500);
    await expect.poll(() => position(page)).toBeGreaterThan(0.05);
    await page.locator(bodySelector).focus();
    for (const key of [
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "End",
        "Home",
    ]) {
        await page.keyboard.press(key);
        await expect(page.locator(active)).toHaveAttribute("id", "1");
    }
    await atPosition(page, 0);
    await page.keyboard.press("End");
    await atPosition(page, 1);
    const reach = await page.locator(bodySelector).evaluate((body) => {
        const end = body.lastElementChild.getBoundingClientRect();
        const viewport = body.getBoundingClientRect();
        return end.bottom <= viewport.bottom + 1 && end.top >= viewport.top;
    });
    expect(reach).toBe(true);
    expect(
        await page
            .locator(`${active} > :is(header,h2,footer)`)
            .evaluateAll((elements) =>
                elements.map((element) => {
                    const rect = element.getBoundingClientRect();
                    return [rect.x, rect.y, rect.width, rect.height];
                }),
            ),
    ).toEqual(fixed);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator(active)).toHaveAttribute(
        "data-marpit-pagination",
        "1",
    );
    await expect(page.locator(active)).toHaveAttribute(
        "data-marpit-pagination-total",
        "3",
    );
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(active)).toHaveAttribute("id", "2");
    await blur(page);
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(active)).toHaveAttribute("id", "3");
    await page.locator('[data-bespoke-marp-osc="prev"]').click({ force: true });
    await expect(page.locator(active)).toHaveAttribute("id", "2");
    await page.locator('[data-bespoke-marp-osc="next"]').click({ force: true });
    await expect(page.locator(active)).toHaveAttribute("id", "3");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(active)).toHaveAttribute("id", "2");
});

test("focused controls and body touch gestures are not turned into slide navigation", async ({
    page,
}) => {
    await open(page);
    const input = page.locator("#entry");
    await input.focus();
    await page.keyboard.press("End");
    await atPosition(page, 0);
    await expect(page.locator(active)).toHaveAttribute("id", "1");
    const control = page.locator("#control");
    await control.evaluate((element) => {
        element.addEventListener("keydown", (event) => {
            element.dataset.key = event.key;
            element.dataset.prevented = String(event.defaultPrevented);
        });
    });
    await control.focus();
    await page.keyboard.press("PageDown");
    // A focused button may natively scroll its ancestor. The feature must
    // leave the key to that control rather than intercept it or change pages.
    await expect(control).toHaveAttribute("data-key", "PageDown");
    await expect(control).toHaveAttribute("data-prevented", "false");
    await expect(page.locator(active)).toHaveAttribute("id", "1");
    await blur(page);
    const events = await page.locator(bodySelector).evaluate((body) => {
        const seen = [];
        const parent = body.closest(".bespoke-marp-parent");
        for (const type of ["touchstart", "touchmove", "touchend"]) {
            parent.addEventListener(type, () => seen.push(type), {
                once: true,
            });
            body.dispatchEvent(
                new Event(type, { bubbles: true, cancelable: true }),
            );
        }
        return seen;
    });
    expect(events).toEqual([]);
    await expect(page.locator(active)).toHaveAttribute("id", "1");
});

test("native touch panning reaches the body without a Bespoke swipe", async ({
    browser,
    browserName,
}) => {
    test.skip(
        browserName !== "chromium",
        "Native touch injection uses Chromium CDP.",
    );
    const context = await browser.newContext({
        hasTouch: true,
        viewport: { width: 1280, height: 720 },
    });
    try {
        await context.route("https://fonts.googleapis.com/**", (route) =>
            route.abort(),
        );
        const page = await context.newPage();
        await open(page);
        const rect = await page.locator(bodySelector).boundingBox();
        const session = await context.newCDPSession(page);
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height * 0.8;
        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 8; step += 1) {
            await session.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x, y: y - step * 30 }],
            });
        }
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
        await expect.poll(() => position(page)).toBeGreaterThan(0.03);
        await expect(page.locator(active)).toHaveAttribute("id", "1");
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    } finally {
        await context.close();
    }
});

test("late presenter joins, bidirectional normalized sync, resize, previews, and revisits", async ({
    page,
    context,
}) => {
    await open(page);
    await scroll(page, 0.63);
    await atPosition(page, 0.63);
    const presenter = await popup(page, context);
    await atPosition(presenter, 0.63);
    await presenter.setViewportSize({ width: 960, height: 600 });
    // SVG scaling alone does not change the logical range. Vary this window's
    // actual body geometry too, so absolute-pixel sync would fail this test.
    await presenter.locator(bodySelector).evaluate((body) => {
        body.style.flex = "none";
        body.style.height = "220px";
    });
    const ranges = await Promise.all(
        [page, presenter].map((target) =>
            target
                .locator(bodySelector)
                .evaluate((body) => body.scrollHeight - body.clientHeight),
        ),
    );
    expect(Math.abs(ranges[0] - ranges[1])).toBeGreaterThan(100);
    await atPosition(presenter, 0.63);
    await scroll(presenter, 0.27);
    await atPosition(page, 0.27);
    await scroll(page, 0.81);
    await atPosition(presenter, 0.81);
    await presenter.keyboard.press("ArrowRight");
    await expect(page.locator(active)).toHaveAttribute("id", "2");
    await presenter.keyboard.press("ArrowRight");
    await expect(page.locator(active)).toHaveAttribute("id", "3");
    await scroll(presenter, 0.44);
    await atPosition(page, 0.44);
    // The next-slide iframe has its own scroll viewport but is never a source.
    const preview = presenter
        .frames()
        .find(
            (frame) => new URL(frame.url()).searchParams.get("view") === "next",
        );
    expect(preview).toBeTruthy();
    await preview
        .locator('section[id="1"] > .marpagent-scroll-body')
        .evaluate((body) => {
            body.scrollTop = body.scrollHeight;
        });
    await presenter.keyboard.press("ArrowLeft");
    await presenter.keyboard.press("ArrowLeft");
    await expect(page.locator(active)).toHaveAttribute("id", "1");
    await atPosition(page, 0.81);
    await atPosition(presenter, 0.81);
    await presenter.keyboard.press("ArrowRight");
    await presenter.keyboard.press("ArrowRight");
    await expect(page.locator(active)).toHaveAttribute("id", "3");
    await atPosition(page, 0.44);
    await atPosition(presenter, 0.44);
});

test("separate native sessions and deck paths are isolated; incoming values are validated", async ({
    page,
    context,
}) => {
    await open(page);
    const session = await page.evaluate(() => history.state.marpBespokeSyncKey);
    const independent = await context.newPage();
    await open(independent);
    expect(
        await independent.evaluate(() => history.state.marpBespokeSyncKey),
    ).not.toBe(session);
    const otherDeck = await context.newPage();
    await otherDeck.goto(
        url.replace("deck.html", `other.html?sync=${session}`),
    );
    expect(
        await otherDeck.evaluate(() => history.state.marpBespokeSyncKey),
    ).toBe(session);
    await scroll(page, 0.7);
    await atPosition(page, 0.7);
    await scroll(independent, 0.2);
    await atPosition(independent, 0.2);
    await atPosition(otherDeck, 0);
    await atPosition(page, 0.7);
    const send = async (message) =>
        page.evaluate((data) => {
            const deck = new URL(location.href);
            deck.hash = "";
            for (const key of ["view", "sync", "f"])
                deck.searchParams.delete(key);
            deck.searchParams.sort();
            const channel = new BroadcastChannel(
                "marpagent-scroll:" +
                    JSON.stringify([
                        deck.href,
                        history.state.marpBespokeSyncKey,
                    ]),
            );
            channel.postMessage(data);
            channel.close();
        }, message);
    for (const fraction of [NaN, Infinity, "0.5", null]) {
        await send({ type: "scroll", slide: "1", fraction });
    }
    await send({ type: "scroll", slide: "missing", fraction: 0 });
    await atPosition(page, 0.7);
    await send({ type: "scroll", slide: "1", fraction: 8 });
    await atPosition(page, 1);
    await send({ type: "scroll", slide: "1", fraction: -2 });
    await atPosition(page, 0);
    // Remember a non-selected slide without ever selecting it.
    await send({ type: "scroll", slide: "3", fraction: 0.4 });
    await expect(page.locator(active)).toHaveAttribute("id", "1");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(active)).toHaveAttribute("id", "3");
    await atPosition(page, 0.4);
});

test("printing resets only the local viewport and never publishes the reset", async ({
    page,
    context,
    browserName,
}, testInfo) => {
    await open(page);
    const presenter = await popup(page, context);
    await scroll(page, 0.6);
    await atPosition(presenter, 0.6);
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await atPosition(page, 0);
    // Wait for the reset's asynchronous scroll event and animation-frame flush.
    await page.evaluate(
        () =>
            new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
    );
    await atPosition(presenter, 0.6);
    await page.emulateMedia({ media: "print" });
    await atPosition(page, 0);
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await atPosition(page, 0.6);
    await atPosition(presenter, 0.6);
    if (browserName === "chromium") {
        const pdf = await page.pdf({ printBackground: true });
        expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
        await testInfo.attach("scroll-initial-viewport.pdf", {
            body: pdf,
            contentType: "application/pdf",
        });
        await atPosition(page, 0.6);
        await atPosition(presenter, 0.6);
    }
});

for (const theme of ["lab", "muji", "toshiba"]) {
    for (const mode of ["normal", "invert"]) {
        test(`${theme} ${mode}: bare HTML preserves canvas, fonts, components, and reachable body`, async ({
            page,
        }) => {
            const marp = createConfiguredMarp();
            marp.themeSet.add(
                fs.readFileSync(path.join(root, `themes/${theme}.css`), "utf8"),
            );
            const size = mode === "normal" ? "4:3" : "a4-portrait";
            const { html, css } = marp.render(`---
theme: ${theme}
class: ${mode}
size: ${size}
header: Fixed header
footer: Fixed footer
paginate: true
math: mathjax
---
<!-- _scroll: true -->
## Fixed heading

<style scoped>.note { border-width: 3px; }</style>

<div class="note">

Formula $x^2$.

</div>

\`\`\`mermaid
flowchart LR
A[Input] --> B[Output]
\`\`\`

${paragraphs}

END

---
## Normal heading

Normal body
`);
            await page.setContent(`<style>${css}</style>${html}`);
            const section = page.locator('section[id="1"]');
            const body = section.locator(":scope > .marpagent-scroll-body");
            await expect(body).toHaveAttribute("role", "region");
            await expect(body).toHaveCSS("overflow-y", "auto");
            await expect(body).toHaveCSS("overflow-x", "hidden");
            await expect(body).toHaveCSS("overscroll-behavior-y", "contain");
            await expect(body.locator(".note")).toHaveCSS(
                "border-width",
                "3px",
            );
            await expect(body.locator("mjx-container")).toHaveCount(1);
            await expect(body.locator(".mermaid-diagram svg")).toHaveCount(1);
            await expect(
                body.locator("script,header,footer,:scope > style"),
            ).toHaveCount(0);
            const geometry = await section.evaluate((element) => {
                const body = element.querySelector(".marpagent-scroll-body");
                const section = element.getBoundingClientRect();
                const viewport = body.getBoundingClientRect();
                const title = element
                    .querySelector("h2")
                    .getBoundingClientRect();
                return {
                    // foreignObject scales with its SVG on screen; the canvas itself
                    // must retain its original logical dimensions.
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                    range: body.scrollHeight - body.clientHeight,
                    horizontal: body.scrollWidth - body.clientWidth,
                    belowTitle: viewport.top >= title.bottom - 1,
                    aboveFooter: viewport.bottom < section.bottom - 30,
                    bodyFont: getComputedStyle(body).fontSize,
                    normalFont: getComputedStyle(
                        document.querySelector('section[id="2"]'),
                    ).fontSize,
                };
            });
            expect(geometry.width).toBeCloseTo(
                mode === "normal" ? 1024 : (210 * 96) / 25.4,
                0,
            );
            expect(geometry.height).toBeCloseTo(
                mode === "normal" ? 768 : (297 * 96) / 25.4,
                0,
            );
            expect(geometry.range).toBeGreaterThan(500);
            expect(geometry.horizontal).toBeLessThanOrEqual(1);
            expect(geometry.belowTitle).toBe(true);
            expect(geometry.aboveFooter).toBe(true);
            expect(geometry.bodyFont).toBe(geometry.normalFont);
            await scroll(page, 1, 'section[id="1"] > .marpagent-scroll-body');
            await expect
                .poll(() =>
                    body.evaluate((element) => {
                        const viewport = element.getBoundingClientRect();
                        const scale = viewport.height / element.clientHeight;
                        return (
                            element.lastElementChild.getBoundingClientRect()
                                .bottom <=
                            viewport.bottom + 1.5 * scale
                        );
                    }),
                )
                .toBe(true);
        });
    }
}
