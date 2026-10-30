const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { inflateSync } = require("node:zlib");
const { runProcess } = require("../helpers/process-group");

const root = path.resolve(__dirname, "../..");
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="steelblue"/><circle cx="320" cy="180" r="120" fill="gold"/><text x="320" y="190" text-anchor="middle" font-family="sans-serif" font-size="30">Synthetic evidence</text></svg>')}`;
const note = "Source: fictional data; not a measured result.<br>Conditions: identical input for both values.<br>Limit: no claim about another setting.<br>All qualifications remain visible.";
function source(theme, size) {
    return `---\nmarp: true\ntheme: ${theme}\nsize: ${size}\nheader: Footnote export contract\npaginate: true\n---\n` + [false, true].map((grown) => `
<h2>Evidence and its conditions${grown ? "<br>Additional heading context" : ""}</h2>
<div class="body">
<figure><img src="${image}" alt="Fictional evidence"/><figcaption>Required source and conditions${grown ? "<br>Additional interpretation boundary" : ""}</figcaption></figure>
<p>Keep this qualification with the evidence.</p>
</div>
<div class="footnote">${note}</div>
`).join("\n---\n");
}

for (const theme of ["lab", "muji", "toshiba"]) {
    for (const size of ["16:9", "4:3"]) {
        test(`${theme} ${size}: long direct footnotes survive HTML, PNG, and PDF exports`, async ({ page }, testInfo) => {
            test.setTimeout(120000);
            const temp = fs.mkdtempSync(path.join(os.tmpdir(), "marp-footnote-export-"));
            try {
                const input = path.join(temp, "slide.md");
                fs.writeFileSync(input, source(theme, size));
                for (const [format, extension] of [["--html", "html"], ["--images", "png"], ["--pdf", "pdf"]]) {
                    const result = await runProcess(process.execPath, ["bin/marpx.js", input, format,
                        ...(format === "--images" ? ["png"] : []), "--output", path.join(temp, `deck.${extension}`)],
                    { cwd: root, env: { ...process.env, MARP_AGENT_NO_OPEN: "1" }, timeoutMs: 45000 });
                    expect(result.status, result.stderr).toBe(0);
                }
                await page.route(/^https?:\/\//, (route) => route.abort());
                await page.goto(pathToFileURL(path.join(temp, "deck.html")).href);
                await page.emulateMedia({ media: "print" });
                await page.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
                await page.evaluate(async () => {
                    await document.fonts.ready;
                    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                });
                const layouts = await page.locator("section").evaluateAll((sections) => sections.map((section) => {
                    const slide = section.getBoundingClientRect();
                    const body = section.querySelector(".body").getBoundingClientRect();
                    const note = section.querySelector(".footnote").getBoundingClientRect();
                    const image = section.querySelector("img").getBoundingClientRect();
                    const caption = section.querySelector("figcaption").getBoundingClientRect();
                    return { width: slide.width, height: slide.height, safe: note.top - body.bottom,
                        noteBottom: slide.bottom - note.bottom, mediaHeight: image.height,
                        captionGap: caption.top - image.bottom, captionClearance: body.bottom - caption.bottom,
                        text: section.querySelector(".footnote").innerText, page: section.dataset.marpitPagination };
                }));
                expect(layouts).toHaveLength(2);
                // Bespoke fits the 4:3 print preview into this 1280x720 viewport;
                // static exports retain the theme's native 1024x768 canvas.
                const width = size === "16:9" ? 1280 : 960;
                const canvasWidth = size === "16:9" ? 1280 : 1024;
                const canvasHeight = size === "16:9" ? 720 : 768;
                for (const [index, layout] of layouts.entries()) {
                    expect([layout.width, layout.height]).toEqual([width, 720]);
                    expect(layout.safe).toBeGreaterThan(1);
                    expect(layout.noteBottom).toBeGreaterThan(0);
                    expect(layout.mediaHeight).toBeGreaterThan(50);
                    expect(layout.captionGap).toBeGreaterThan(0);
                    expect(layout.captionClearance).toBeGreaterThan(0);
                    expect(layout.text).toBe(note.replaceAll("<br>", "\n"));
                    expect(layout.page).toBe(String(index + 1));
                }
                expect(layouts[1].mediaHeight).toBeLessThan(layouts[0].mediaHeight);
                const pngs = fs.readdirSync(temp).filter((name) => /^deck\.\d+\.png$/.test(name)).sort();
                expect(pngs).toHaveLength(2);
                for (const name of pngs) {
                    const bytes = fs.readFileSync(path.join(temp, name));
                    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
                    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([canvasWidth, canvasHeight]);
                    fs.copyFileSync(path.join(temp, name), testInfo.outputPath(name));
                    await testInfo.attach(name, { path: testInfo.outputPath(name), contentType: "image/png" });
                }
                const pdf = fs.readFileSync(path.join(temp, "deck.pdf"));
                fs.writeFileSync(testInfo.outputPath("deck.pdf"), pdf);
                expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
                const pdfSource = pdf.toString("latin1");
                const dictionaries = [pdfSource];
                // Keep every payload byte: compressed data may itself end in LF.
                for (const match of pdfSource.matchAll(/\bstream\r?\n([\s\S]*?)endstream/g)) {
                    try { dictionaries.push(inflateSync(Buffer.from(match[1], "latin1")).toString("latin1")); }
                    catch { /* Images may use a different encoding. */ }
                }
                const content = dictionaries.join("\n");
                expect(content.match(/\/Type\s*\/Page\b/g)).toHaveLength(2);
                expect(content).toMatch(new RegExp(`/MediaBox\\s*\\[\\s*0\\s+0\\s+${canvasWidth * 0.75}\\s+${canvasHeight * 0.75}\\s*\\]`));
                fs.writeFileSync(testInfo.outputPath("layouts.json"), JSON.stringify(layouts, null, 2) + "\n");
                await testInfo.attach("deck.pdf", { path: testInfo.outputPath("deck.pdf"), contentType: "application/pdf" });
                await testInfo.attach("layouts.json", { path: testInfo.outputPath("layouts.json"), contentType: "application/json" });
            } finally {
                fs.rmSync(temp, { recursive: true, force: true });
            }
        });
    }
}
