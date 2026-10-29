const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { inflateSync } = require("node:zlib");
const { runProcess } = require("../helpers/process-group");

const repoRoot = path.resolve(__dirname, "../..");

test("body compositions keep media and captions inside HTML, image, and PDF exports", async ({
    page,
}, testInfo) => {
    test.setTimeout(120000);
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "marp-body-exports-"));
    try {
        const htmlPath = path.join(temp, "body.html");
        for (const [format, output] of [
            ["--html", htmlPath],
            ["--images", path.join(temp, "body.png")],
            ["--pdf", path.join(temp, "body.pdf")],
        ]) {
            const args = [
                "bin/marpx.js",
                "fixtures/body-layout-slide.md",
                format,
            ];
            if (format === "--images") args.push("png");
            const result = await runProcess(
                process.execPath,
                [...args, "--output", output],
                {
                    cwd: repoRoot,
                    env: { ...process.env, MARP_AGENT_NO_OPEN: "1" },
                    timeoutMs: 45000,
                },
            );
            expect(result.status, result.stderr).toBe(0);
        }

        // Standalone HTML expects its relative assets beside the exported file.
        fs.copyFileSync(
            path.join(repoRoot, "fixtures/body-layout-media.svg"),
            path.join(temp, "body-layout-media.svg"),
        );
        await page.route(
            /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            (route) => route.abort(),
        );
        await page.goto(pathToFileURL(htmlPath).href);
        await page
            .locator("img")
            .evaluateAll((images) =>
                Promise.all(images.map((img) => img.decode())),
            );

        // Print removes Bespoke's presentation scaling so all four canvases can
        // be measured in the coordinate system used by the static exports.
        await page.emulateMedia({ media: "print" });
        const layouts = await page.locator("section").evaluateAll((sections) =>
            sections.map((section) => {
                const slide = section.getBoundingClientRect();
                const body = section
                    .querySelector(".body")
                    .getBoundingClientRect();
                const footer = section
                    .querySelector("footer")
                    .getBoundingClientRect();
                return {
                    width: slide.width,
                    height: slide.height,
                    safe: footer.top - body.bottom,
                    figures: [...section.querySelectorAll("figure")].map(
                        (figure) => {
                            const media = figure
                                .querySelector("img")
                                .getBoundingClientRect();
                            const caption = figure
                                .querySelector("figcaption")
                                .getBoundingClientRect();
                            return {
                                mediaHeight: media.height,
                                captionHeight: caption.height,
                                captionGap: caption.top - media.bottom,
                                bottomClearance: body.bottom - caption.bottom,
                            };
                        },
                    ),
                };
            }),
        );
        expect(layouts).toHaveLength(4);
        for (const layout of layouts) {
            expect(layout.width).toBeCloseTo(1280, 1);
            expect(layout.height).toBeCloseTo(720, 1);
            expect(layout.safe).toBeGreaterThan(0);
            for (const figure of layout.figures) {
                expect(figure.mediaHeight).toBeGreaterThan(50);
                expect(figure.captionHeight).toBeGreaterThan(10);
                expect(figure.captionGap).toBeGreaterThan(0);
                expect(figure.bottomClearance).toBeGreaterThanOrEqual(-1);
            }
        }

        const pngPaths = fs
            .readdirSync(temp)
            .filter((name) => /^body\.\d+\.png$/.test(name))
            .sort();
        expect(pngPaths).toHaveLength(4);
        for (const pngPath of pngPaths) {
            const bytes = fs.readFileSync(path.join(temp, pngPath));
            expect(bytes.subarray(1, 4).toString()).toBe("PNG");
            expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
                1280, 720,
            ]);
        }
        const pdf = fs.readFileSync(path.join(temp, "body.pdf"));
        expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
        const pdfSource = pdf.toString("latin1");
        // Marp stores page dictionaries in Flate object streams. Inspect those
        // alongside plain dictionaries without depending on PDF object IDs.
        const dictionaries = [pdfSource];
        for (const match of pdfSource.matchAll(
            /\bstream\r?\n([\s\S]*?)\r?\nendstream/g,
        )) {
            try {
                dictionaries.push(
                    inflateSync(Buffer.from(match[1], "latin1")).toString(
                        "latin1",
                    ),
                );
            } catch {
                // Images may use other encodings; they are not dictionaries.
            }
        }
        const pdfContent = dictionaries.join("\n");
        expect(pdfContent.match(/\/Type\s*\/Page\b/g)).toHaveLength(4);
        expect(pdfContent).toMatch(/\/MediaBox\s*\[\s*0\s+0\s+960\s+540\s*\]/);
        await testInfo.attach("body-export-first-slide", {
            path: path.join(temp, pngPaths[0]),
            contentType: "image/png",
        });
        await testInfo.attach("body-export-pdf", {
            body: pdf,
            contentType: "application/pdf",
        });
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
});
