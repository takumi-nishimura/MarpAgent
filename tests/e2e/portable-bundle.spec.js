const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { pathToFileURL } = require("node:url");
const { unzipSync } = require("fflate");
const { runProcess } = require("../helpers/process-group");

const repoRoot = path.resolve(__dirname, "../..");
const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
);

function write(root, name, data) {
    const dest = path.join(root, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
}

async function videoFixture(browser) {
    const page = await browser.newPage();
    try {
        const bytes = await page.evaluate(async () => {
            const canvas = document.createElement("canvas");
            canvas.width = 32;
            canvas.height = 32;
            const context = canvas.getContext("2d");
            const stream = canvas.captureStream(10);
            const recorder = new MediaRecorder(stream, {
                mimeType: "video/webm;codecs=vp8",
            });
            const chunks = [];
            recorder.ondataavailable = (event) => chunks.push(event.data);
            const result = new Promise((resolve) => {
                recorder.onstop = async () =>
                    resolve(
                        Array.from(
                            new Uint8Array(
                                await new Blob(chunks).arrayBuffer(),
                            ),
                        ),
                    );
            });
            recorder.start();
            for (let i = 0; i < 3; i++) {
                context.fillStyle = ["red", "green", "blue"][i];
                context.fillRect(0, 0, 32, 32);
                await new Promise((resolve) => setTimeout(resolve, 120));
            }
            recorder.stop();
            stream.getTracks().forEach((track) => track.stop());
            return result;
        });
        return Buffer.from(bytes);
    } finally {
        await page.close();
    }
}

function wavFixture() {
    const data = Buffer.alloc(44 + 1600);
    data.write("RIFF");
    data.writeUInt32LE(data.length - 8, 4);
    data.write("WAVEfmt ", 8);
    data.writeUInt32LE(16, 16);
    data.writeUInt16LE(1, 20);
    data.writeUInt16LE(1, 22);
    data.writeUInt32LE(8000, 24);
    data.writeUInt32LE(16000, 28);
    data.writeUInt16LE(2, 32);
    data.writeUInt16LE(16, 34);
    data.write("data", 36);
    data.writeUInt32LE(1600, 40);
    return data;
}

async function staticServer(root) {
    const server = http.createServer((request, response) => {
        const pathname = decodeURIComponent(
            new URL(request.url, "http://localhost").pathname,
        );
        const file = path.join(
            root,
            pathname === "/" ? "index.html" : pathname,
        );
        const types = {
            ".html": "text/html",
            ".css": "text/css",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".webm": "video/webm",
            ".wav": "audio/wav",
        };
        try {
            response.setHeader(
                "content-type",
                types[path.extname(file)] || "application/octet-stream",
            );
            response.end(fs.readFileSync(file));
        } catch {
            response.writeHead(404).end();
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return {
        server,
        url: `http://127.0.0.1:${server.address().port}/index.html`,
    };
}

test("relocated bundle loads every displayed page and CSS/SVG/media with remote networking blocked", async ({
    browser,
}) => {
    test.setTimeout(90000);
    const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-source-"));
    const destination = fs.mkdtempSync(
        path.join(os.tmpdir(), "bundle-relocated-"),
    );
    let server;
    try {
        const video = await videoFixture(browser);
        const deck = "decks/deep/talk";
        write(sourceRoot, `${deck}/assets/写真 image.png`, png);
        write(sourceRoot, `${deck}/assets/poster.png`, png);
        write(sourceRoot, `${deck}/assets/movie.webm`, video);
        write(sourceRoot, `${deck}/assets/audio.wav`, wavFixture());
        write(sourceRoot, `${deck}/assets/unrelated.png`, "PRIVATE_UNUSED");
        write(sourceRoot, `${deck}/assets/hidden.png`, "PRIVATE_HIDDEN");
        write(sourceRoot, `${deck}/brief.md`, "PRIVATE_BRIEF");
        write(sourceRoot, `${deck}/.env`, "PRIVATE_ENV");
        write(sourceRoot, "decks/owner/assets/reused.png", png);
        write(
            sourceRoot,
            "assets/css/theme.css",
            '@import "nested/palette.css?version=1#palette"; section { --portable-css: 42; }',
        );
        write(
            sourceRoot,
            "assets/css/nested/palette.css",
            '.css-image { background-image: url("../../img/same.png?color=1#pixel"); width: 12px; height: 12px; }',
        );
        write(sourceRoot, "assets/img/same.png", png);
        write(
            sourceRoot,
            "assets/img/diagram.svg",
            '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><image href="same.png" width="12" height="12"/><rect id="local" width="1" height="1" fill="red"/><use href="#local"/></svg>',
        );
        fs.symlinkSync(
            "../../../assets",
            path.join(sourceRoot, deck, "shared"),
            "dir",
        );
        fs.symlinkSync(
            "../../../owner/assets/reused.png",
            path.join(sourceRoot, deck, "assets/reused.png"),
        );
        write(
            sourceRoot,
            `${deck}/slide.md`,
            `---
marp: true
theme: default
paginate: true
math: mathjax
---
# Local resources
<link rel="stylesheet" href="shared/css/theme.css">
<img src="assets/写真%20image.png?x=1&amp;y=2#pixel" width="12">
<img src="assets/reused.png" width="12"><img src="shared/img/diagram.svg" width="12">
<div class="css-image"></div>
Visible [citation](https://example.org/research)
<!-- PRIVATE_SPEAKER_NOTE <img src="assets/hidden.png"> -->

---
<!-- hide: true -->
# PRIVATE_HIDDEN_SLIDE
<img src="assets/hidden.png">

---
<!-- _scroll: true -->
# Media and math
<video src="assets/movie.webm" poster="assets/poster.png" width="32" controls preload="auto"></video>
<audio src="assets/audio.wav" controls preload="auto"></audio>
<img src="assets/reused.png" width="12">
$x^2 + y^2 = z^2$
`,
        );
        const output = path.join(destination, "deck.zip");
        const result = await runProcess(
            process.execPath,
            [
                path.join(repoRoot, "bin/marpx.js"),
                path.join(sourceRoot, deck, "slide.md"),
                "--zip",
                "--strict-offline",
                "--bundle-root",
                sourceRoot,
                "--output",
                output,
            ],
            { cwd: repoRoot },
        );
        expect(result.status, result.stderr).toBe(0);
        const entries = unzipSync(fs.readFileSync(output));
        for (const [name, data] of Object.entries(entries))
            write(destination, name, data);
        const manifest = JSON.parse(
            Buffer.from(entries["manifest.json"]).toString(),
        );
        expect(manifest.remoteDependencies).toEqual([]);
        expect(manifest.unsupported).toEqual([]);
        const html = Buffer.from(entries["index.html"]).toString();
        expect(html.includes("PRIVATE_")).toBe(false);
        expect(html).toContain("https://example.org/research");
        expect(
            manifest.files.some((f) => f.source?.includes("hidden.png")),
        ).toBe(false);
        expect(JSON.stringify(manifest)).not.toContain(sourceRoot);
        // Destroy the source tree before opening the exported deck.
        fs.rmSync(sourceRoot, { recursive: true, force: true });
        const running = await staticServer(destination);
        server = running.server;
        for (const url of [
            pathToFileURL(path.join(destination, "index.html")).href,
            running.url,
        ]) {
            const context = await browser.newContext();
            const remoteRequests = [];
            const failed = [];
            await context.route("**/*", async (route) => {
                const requestUrl = route.request().url();
                if (
                    /^https?:/.test(requestUrl) &&
                    !requestUrl.startsWith(
                        running.url.replace("/index.html", "/"),
                    )
                ) {
                    remoteRequests.push(requestUrl);
                    await route.abort();
                } else await route.continue();
            });
            try {
                const page = await context.newPage();
                page.on("requestfailed", (r) =>
                    failed.push(`${r.url()}: ${r.failure()?.errorText}`),
                );
                await page.goto(url);
                await expect(page.locator("section")).toHaveCount(2);
                await expect(page.locator(".bespoke-marp-note")).toHaveCount(0);
                for (let index = 0; index < 2; index++) {
                    await page.goto(url + `#${index + 1}`);
                    await expect(
                        page.locator(".bespoke-marp-active section"),
                    ).toHaveAttribute("id", ["1", "3"][index]);
                    await expect(
                        page.locator(".bespoke-marp-active section"),
                    ).toHaveAttribute(
                        "data-marpit-pagination",
                        String(index + 1),
                    );
                    await expect
                        .poll(() =>
                            page
                                .locator("img")
                                .evaluateAll((images) =>
                                    images.every(
                                        (image) =>
                                            image.complete &&
                                            image.naturalWidth > 0,
                                    ),
                                ),
                        )
                        .toBe(true);
                }
                await expect
                    .poll(() =>
                        page
                            .locator("video")
                            .evaluate(
                                (media) =>
                                    media.readyState >= 2 &&
                                    media.videoWidth === 32,
                            ),
                    )
                    .toBe(true);
                await expect
                    .poll(() =>
                        page
                            .locator("audio")
                            .evaluate((media) => media.readyState >= 2),
                    )
                    .toBe(true);
                expect(
                    await page
                        .locator("section")
                        .first()
                        .evaluate((element) =>
                            getComputedStyle(element)
                                .getPropertyValue("--portable-css")
                                .trim(),
                        ),
                ).toBe("42");
                expect(
                    await page
                        .locator(".css-image")
                        .evaluate(
                            (element) =>
                                getComputedStyle(element).backgroundImage,
                        ),
                ).toContain("assets/");
                await expect(page.locator("mjx-container")).toHaveCount(1);
                expect(failed).toEqual([]);
                expect(remoteRequests).toEqual([]);
            } finally {
                await context.close();
            }
        }
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        fs.rmSync(sourceRoot, { recursive: true, force: true });
        fs.rmSync(destination, { recursive: true, force: true });
    }
});

test("Mermaid font dependencies are disclosed, rejected by strict offline, and blocked during relocated viewing", async ({
    browser,
}) => {
    const sourceRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "bundle-mermaid-"),
    );
    const destination = fs.mkdtempSync(
        path.join(os.tmpdir(), "bundle-mermaid-relocated-"),
    );
    let server;
    try {
        const deckPath = path.join(sourceRoot, "slide.md");
        write(
            sourceRoot,
            "slide.md",
            "---\nmarp: true\ntheme: default\n---\n# Diagram\n\n```mermaid\nflowchart LR\n  Local --> Export\n```\n",
        );
        const outputPath = path.join(destination, "diagram.zip");
        const args = [
            path.join(repoRoot, "bin/marpx.js"),
            deckPath,
            "--zip",
            "--bundle-root",
            sourceRoot,
            "--output",
            outputPath,
        ];
        const exported = await runProcess(process.execPath, args, {
            cwd: repoRoot,
        });
        expect(exported.status, exported.stderr).toBe(0);
        const archive = fs.readFileSync(outputPath);
        const entries = unzipSync(archive);
        const manifest = JSON.parse(
            Buffer.from(entries["manifest.json"]).toString(),
        );
        expect(
            manifest.remoteDependencies.some((item) =>
                item.reference.startsWith("https://fonts.googleapis.com/"),
            ),
        ).toBe(true);
        expect(Buffer.from(entries["README.txt"]).toString()).toContain(
            "fonts.googleapis.com",
        );
        const refused = await runProcess(
            process.execPath,
            [...args, "--force", "--strict-offline"],
            { cwd: repoRoot },
        );
        expect(refused.status).toBe(1);
        expect(refused.stderr).toContain("fonts.googleapis.com");
        expect(fs.readFileSync(outputPath)).toEqual(archive);
        for (const [name, data] of Object.entries(entries))
            write(destination, name, data);
        fs.rmSync(sourceRoot, { recursive: true, force: true });
        const running = await staticServer(destination);
        server = running.server;
        const context = await browser.newContext();
        const blocked = [];
        await context.route("**/*", async (route) => {
            const url = route.request().url();
            if (
                /^https?:/.test(url) &&
                !url.startsWith(running.url.replace("/index.html", "/"))
            ) {
                blocked.push(url);
                await route.abort();
            } else await route.continue();
        });
        try {
            const page = await context.newPage();
            await page.goto(running.url);
            await expect(page.locator(".mermaid-diagram svg")).toHaveCount(1);
            await expect(page.locator(".mermaid-diagram")).toContainText(
                "Export",
            );
            expect(
                blocked.every((url) =>
                    url.startsWith("https://fonts.googleapis.com/"),
                ),
            ).toBe(true);
        } finally {
            await context.close();
        }
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        fs.rmSync(sourceRoot, { recursive: true, force: true });
        fs.rmSync(destination, { recursive: true, force: true });
    }
});

test("ZIP CLI excludes private symlink targets and resolver metadata while preserving existing output on rejection", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-private-e2e-"));
    try {
        const deck = "decks/talk";
        const deckPath = path.join(root, deck, "slide.md");
        const output = path.join(root, "keep.zip");
        const sentinels = [
            "PRIVATE_ENV_SECRET",
            "PRIVATE_GIT_SECRET",
            "PRIVATE_SOURCE_CONTEXT",
        ];
        write(root, ".env", sentinels[0]);
        write(root, ".git/objects/private.png", sentinels[1]);
        write(root, `${deck}/assets/public.png`, png);
        write(root, "decks/owner/assets/public.png", png);
        fs.symlinkSync(
            "../../../.env",
            path.join(root, deck, "assets/innocent.svg"),
        );
        fs.symlinkSync(
            "../../../.git/objects/private.png",
            path.join(root, deck, "assets/innocent.png"),
        );
        fs.symlinkSync(
            "../../owner/assets",
            path.join(root, deck, "assets/whole"),
            "dir",
        );
        fs.symlinkSync(
            path.join(root, "decks/owner/assets/public.png"),
            path.join(root, deck, "assets/absolute.png"),
        );
        write(
            root,
            `${deck}/slide.md`,
            `---\nmarp: true\ntheme: default\n---\n# Public deck\n\n<img src="assets/public.png">\n<!-- ${sentinels[2]} <img src="assets/innocent.svg"> -->\n`,
        );
        const args = [
            path.join(repoRoot, "bin/marpx.js"),
            deckPath,
            "--zip",
            "--bundle-root",
            root,
            "--strict-offline",
            "--output",
            output,
        ];
        const first = await runProcess(process.execPath, args, {
            cwd: repoRoot,
        });
        expect(first.status, first.stderr).toBe(0);
        const archive = fs.readFileSync(output);
        const entries = unzipSync(archive);
        for (const data of Object.values(entries)) {
            for (const sentinel of sentinels)
                expect(Buffer.from(data).toString().includes(sentinel)).toBe(
                    false,
                );
        }
        for (const name of ["manifest.json", "README.txt"])
            expect(Buffer.from(entries[name]).toString().includes(root)).toBe(
                false,
            );
        fs.appendFileSync(
            deckPath,
            '<img src="assets/innocent.svg"><img src="assets/innocent.png"><img src="assets/whole/public.png"><img src="assets/absolute.png">\n',
        );
        const dry = await runProcess(
            process.execPath,
            [...args, "--force", "--dry-run"],
            { cwd: repoRoot },
        );
        expect(dry.status, dry.stderr).toBe(1);
        const manifest = JSON.parse(dry.stdout);
        expect(
            manifest.errors.filter(
                (error) => error.code === "PRIVATE_RESOURCE",
            ),
        ).toHaveLength(2);
        for (const code of ["DIRECTORY_REUSE", "ABSOLUTE_SYMLINK"])
            expect(manifest.errors.some((error) => error.code === code)).toBe(
                true,
            );
        expect(JSON.stringify(manifest).includes(root)).toBe(false);
        for (const sentinel of sentinels)
            expect(JSON.stringify(manifest).includes(sentinel)).toBe(false);
        const rejected = await runProcess(
            process.execPath,
            [...args, "--force"],
            { cwd: repoRoot },
        );
        expect(rejected.status).toBe(1);
        expect(fs.readFileSync(output)).toEqual(archive);
        expect(fs.readFileSync(path.join(root, ".env"), "utf8")).toBe(
            sentinels[0],
        );
        expect(
            fs.readFileSync(
                path.join(root, ".git/objects/private.png"),
                "utf8",
            ),
        ).toBe(sentinels[1]);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test("ZIP CLI rejects a post-inspection symlink exchange before reading outside bytes", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-race-e2e-"));
    const outside = fs.mkdtempSync(
        path.join(os.tmpdir(), "bundle-race-secret-"),
    );
    try {
        const target = path.join(root, "assets/public.png");
        const secret = path.join(outside, "private.png");
        const audit = path.join(root, "audit.json");
        const preload = path.join(root, "exchange.cjs");
        write(root, "assets/public.png", png);
        write(outside, "private.png", "PRIVATE_RACE_CONTENT");
        const deckPath = path.join(root, "slide.md");
        write(
            root,
            "slide.md",
            '---\nmarp: true\ntheme: default\n---\n# Snapshot\n\n<img src="assets/public.png">\n',
        );
        const output = path.join(root, "keep.zip");
        const args = [
            path.join(repoRoot, "bin/marpx.js"),
            deckPath,
            "--zip",
            "--bundle-root",
            root,
            "--strict-offline",
            "--output",
            output,
        ];
        const first = await runProcess(process.execPath, args, {
            cwd: repoRoot,
        });
        expect(first.status, first.stderr).toBe(0);
        const original = fs.readFileSync(output);
        // This deterministic adversarial preload affects only the ZIP process,
        // after resolver inspection and before the actual resource open.
        fs.writeFileSync(
            preload,
            `const fs = require("node:fs");
const target = ${JSON.stringify(target)};
const secret = ${JSON.stringify(secret)};
const auditPath = ${JSON.stringify(audit)};
const open = fs.openSync, read = fs.readSync, close = fs.closeSync;
const state = { swapped: false, reads: 0, closed: false };
let externalFd;
fs.openSync = function(file, ...args) {
  if (file === target && !state.swapped) {
    fs.unlinkSync(target);
    fs.symlinkSync(secret, target);
    state.swapped = true;
    externalFd = open.call(this, file, ...args);
    return externalFd;
  }
  return open.call(this, file, ...args);
};
fs.readSync = function(fd, ...args) {
  if (fd === externalFd) state.reads += 1;
  return read.call(this, fd, ...args);
};
fs.closeSync = function(fd) {
  if (fd === externalFd) state.closed = true;
  return close.call(this, fd);
};
process.once("exit", () => fs.writeFileSync(auditPath, JSON.stringify(state)));
`,
        );
        const rejected = await runProcess(
            process.execPath,
            ["--require", preload, ...args, "--force"],
            { cwd: repoRoot },
        );
        expect(rejected.status, rejected.stderr).toBe(1);
        expect(rejected.stderr).toContain("RESOURCE_CHANGED");
        expect(JSON.parse(fs.readFileSync(audit, "utf8"))).toEqual({
            swapped: true,
            reads: 0,
            closed: true,
        });
        expect(fs.readFileSync(output)).toEqual(original);
        expect(
            fs
                .readdirSync(root)
                .some((name) => name.startsWith(".marp-bundle-")),
        ).toBe(false);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
    }
});
