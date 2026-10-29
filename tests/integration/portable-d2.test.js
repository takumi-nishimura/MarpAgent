const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const { unzipSync } = require("fflate");
const { resolveD2 } = require("../../src/d2-render");
const { runProcess } = require("../helpers/process-group");

const repoRoot = path.resolve(__dirname, "../..");
const marpx = path.join(repoRoot, "bin/marpx.js");
const runtime = resolveD2();
assert.ok(
    process.env.MARP_AGENT_D2_FONT_PATH,
    "An explicitly provided Japanese TTF is required for ZIP D2 acceptance.",
);
const font = fs.realpathSync(process.env.MARP_AGENT_D2_FONT_PATH);

function write(root, name, content) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
}

function temporary(t, prefix) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}

function exportZip(deck, root, output, env, flags = []) {
    return runProcess(
        process.execPath,
        [
            marpx,
            deck,
            "--zip",
            "--strict-offline",
            "--bundle-root",
            root,
            "--output",
            output,
            ...flags,
        ],
        {
            cwd: repoRoot,
            env: { ...process.env, ...env },
        },
    );
}

async function serve(root) {
    const types = {
        ".html": "text/html",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".css": "text/css",
    };
    const server = http.createServer((request, response) => {
        const pathname = new URL(request.url, "http://localhost").pathname;
        const file = path.join(
            root,
            decodeURIComponent(pathname === "/" ? "/index.html" : pathname),
        );
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

test(
    "D2 ZIP renders Japanese, repeated diagrams and math after removing the source repo and configured compiler",
    { timeout: 90000 },
    async (t) => {
        const source = temporary(t, "zip-d2-source-");
        const delivery = temporary(t, "zip-d2-delivery-");
        const compiler = path.join(source, "tools/d2");
        fs.mkdirSync(path.dirname(compiler), { recursive: true });
        fs.symlinkSync(runtime.executable, compiler);
        const originalFont = write(
            source,
            "fonts/explicit.ttf",
            fs.readFileSync(font),
        );
        const deck = write(
            source,
            "decks/deep/talk/slide.md",
            `---
marp: true
theme: default
paginate: true
style: |
  section .d2-diagram { --d2-max-height: 340px; --d2-width: 100%; }
---
# D2: Japanese labels and independent IDs

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
<div>

\`\`\`d2
direction: right
*.style.font-size: 28
human: 人間
robot: ロボット
human -> robot: 方針 {style.italic: false}
\`\`\`

</div>
<div>

\`\`\`d2
direction: right
*.style.font-size: 28
human: 人間
robot: ロボット
human -> robot: 方針 {style.italic: false}
\`\`\`

</div>
</div>

---
# D2: Groups and math

\`\`\`d2
direction: right
*.style.font-size: 28
agent: {
  label: 協調エージェント
  input: 入力
  update: 更新
  input -> update
}
formula: |latex
x^2 + \\alpha = \\frac{1}{2}
|
agent -> formula
\`\`\`

---
<!-- hide: true -->
# PRIVATE_HIDDEN_D2

\`\`\`d2
invalid: {
\`\`\`
`,
        );
        const output = path.join(delivery, "d2.zip");
        const result = await exportZip(deck, source, output, {
            MARP_AGENT_D2_PATH: compiler,
            MARP_AGENT_D2_FONT_PATH: "../../../fonts/explicit.ttf",
            MARP_AGENT_D2_FONT_ITALIC_PATH: "",
            MARP_AGENT_D2_CWD: "",
        });
        assert.equal(result.status, 0, result.stderr);
        const entries = unzipSync(fs.readFileSync(output));
        const manifest = JSON.parse(
            Buffer.from(entries["manifest.json"]).toString(),
        );
        assert.deepEqual(manifest.remoteDependencies, []);
        assert.deepEqual(manifest.unsupported, []);
        assert.deepEqual(manifest.errors, []);
        assert.equal(manifest.renderer.d2, "0.9.0");
        assert.ok(!JSON.stringify(manifest).includes(source));
        assert.ok(
            Object.keys(entries).every(
                (name) => !/\.(?:d2|ttf|woff2?)$/i.test(name),
            ),
        );
        const html = Buffer.from(entries["index.html"]).toString();
        assert.equal((html.match(/class="d2-diagram"/g) || []).length, 3);
        assert.ok(!html.includes("PRIVATE_HIDDEN_D2"));
        assert.match(html, /data:(?:application|font)\/[^;]+;base64,/);
        for (const [name, data] of Object.entries(entries))
            write(delivery, name, data);
        const artifacts = process.env.MARP_AGENT_ZIP_D2_ARTIFACT_DIR;
        if (artifacts) {
            fs.mkdirSync(artifacts, { recursive: true });
            fs.copyFileSync(output, path.join(artifacts, "combined-d2.zip"));
        }
        fs.rmSync(source, { recursive: true, force: true });
        assert.equal(fs.existsSync(source), false);
        assert.equal(fs.existsSync(compiler), false);
        assert.equal(fs.existsSync(originalFont), false);
        const noTools = path.join(delivery, "empty-path");
        fs.mkdirSync(noTools);
        const browser = await chromium.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            env: {
                ...process.env,
                PATH: noTools,
                MARP_AGENT_D2_PATH: compiler,
                MARP_AGENT_D2_FONT_PATH: originalFont,
            },
        });
        const serving = await serve(delivery);
        try {
            for (const [scheme, url] of [
                ["file", pathToFileURL(path.join(delivery, "index.html")).href],
                ["http", serving.url],
            ]) {
                const context = await browser.newContext();
                const remote = [];
                const failed = [];
                await context.route("**/*", async (route) => {
                    const requested = route.request().url();
                    if (
                        /^https?:/.test(requested) &&
                        !requested.startsWith(
                            serving.url.replace("/index.html", "/"),
                        )
                    ) {
                        remote.push(requested);
                        await route.abort();
                    } else await route.continue();
                });
                try {
                    const page = await context.newPage();
                    page.on("requestfailed", (request) =>
                        failed.push(request.url()),
                    );
                    for (const position of [1, 2]) {
                        await page.goto(`${url}#${position}`);
                        await page.waitForSelector(
                            `.bespoke-marp-active section[data-marpit-pagination="${position}"]`,
                        );
                        await page.evaluate(async () =>
                            Promise.all(
                                Array.from(document.fonts).map((face) =>
                                    face.load(),
                                ),
                            ),
                        );
                        const visible = await page
                            .locator(".bespoke-marp-active .d2-diagram > svg")
                            .evaluateAll((svgs) =>
                                svgs.map((svg) => ({
                                    width: svg.getBoundingClientRect().width,
                                    height: svg.getBoundingClientRect().height,
                                    text: svg.textContent,
                                })),
                            );
                        assert.equal(visible.length, position === 1 ? 2 : 1);
                        assert.ok(
                            visible.every(
                                (svg) => svg.width > 0 && svg.height > 0,
                            ),
                        );
                        assert.ok(
                            visible.some((svg) =>
                                svg.text.includes(
                                    position === 1
                                        ? "人間"
                                        : "協調エージェント",
                                ),
                            ),
                        );
                        assert.ok(
                            await page.evaluate(() =>
                                Array.from(document.fonts).some(
                                    (face) =>
                                        face.family.includes("marpagent-d2") &&
                                        face.status === "loaded",
                                ),
                            ),
                        );
                        if (artifacts)
                            await page.screenshot({
                                path: path.join(
                                    artifacts,
                                    `${scheme}-page-${position}.png`,
                                ),
                            });
                    }
                    const ids = await page
                        .locator(".d2-diagram svg [id]")
                        .evaluateAll((nodes) => nodes.map((node) => node.id));
                    assert.ok(ids.length > 0);
                    assert.equal(ids.length, new Set(ids).size);
                    assert.deepEqual(remote, []);
                    assert.deepEqual(failed, []);
                } finally {
                    await context.close();
                }
            }
        } finally {
            await browser.close();
            await new Promise((resolve) => serving.server.close(resolve));
        }
    },
);

test(
    "real D2 compile and missing-tool failures cannot publish a successful ZIP or replace existing output",
    { timeout: 60000 },
    async (t) => {
        const root = temporary(t, "zip-d2-failure-");
        const deck = write(
            root,
            "slide.md",
            "---\nmarp: true\ntheme: default\n---\n# Valid\n\n```d2\na -> b\n```\n",
        );
        const output = path.join(root, "keep.zip");
        const env = {
            MARP_AGENT_D2_PATH: runtime.executable,
            MARP_AGENT_D2_FONT_PATH: font,
            MARP_AGENT_D2_STRICT: "0",
        };
        const first = await exportZip(deck, root, output, env);
        assert.equal(first.status, 0, first.stderr);
        const archive = fs.readFileSync(output);
        fs.writeFileSync(
            deck,
            "---\nmarp: true\ntheme: default\n---\n# Invalid\n\n```d2\na: {\n```\n",
        );
        for (const flags of [["--force"], ["--force", "--dry-run"]]) {
            const rejected = await exportZip(deck, root, output, env, flags);
            assert.notEqual(rejected.status, 0);
            assert.match(rejected.stderr, /D2/i);
            assert.deepEqual(fs.readFileSync(output), archive);
        }
        fs.writeFileSync(
            deck,
            "---\nmarp: true\ntheme: default\n---\n# Missing compiler\n\n```d2\na -> b\n```\n",
        );
        const absent = await exportZip(
            deck,
            root,
            output,
            { ...env, MARP_AGENT_D2_PATH: path.join(root, "not-installed") },
            ["--force"],
        );
        assert.notEqual(absent.status, 0);
        assert.match(absent.stderr, /D2.*(?:not found|executable)/i);
        assert.deepEqual(fs.readFileSync(output), archive);
        assert.equal(
            fs
                .readdirSync(root)
                .some(
                    (name) =>
                        name.startsWith(".marp-bundle-") ||
                        /\.(?:svg|d2)$/.test(name),
                ),
            false,
        );
    },
);
