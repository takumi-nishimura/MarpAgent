const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");
const { renderD2Sync, resolveD2, PRELUDE } = require("../../src/d2-render");
const { runD2ProcessSync } = require("../../src/d2-process");
const { createConfiguredMarp } = require("../../src/slide-map");
const { assertD2RenderSucceeded } = require("../../src/d2-diagnostics");
const { SaxesParser } = require("saxes");

// This is an explicit acceptance command, not an optional auto-skipped unit
// test. Its host D2 and Japanese font must be installed before it is invoked.
const runtime = resolveD2();
assert.ok(
    process.env.MARP_AGENT_D2_FONT_PATH,
    "Set MARP_AGENT_D2_FONT_PATH to a Japanese-capable TTF font for D2 acceptance.",
);

function workspace(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "d2-acceptance-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}

function raw(source, args = [], env = runtime.env) {
    const svg = runD2ProcessSync(
        runtime.executable,
        [
            "--no-xml-tag",
            "--salt=precedence",
            "--bundle=false",
            "--target=",
            ...args,
            "-",
            "-",
        ],
        { input: source, env, timeoutMs: 10000 },
    ).stdout;
    // D2 hashes the full config into CSS/ID names. Compare actual layout
    // geometry instead of assuming byte-identical SVG for equivalent config.
    const geometry = [];
    const parser = new SaxesParser();
    parser.on("opentag", (tag) => {
        if (["svg", "rect", "path", "polygon", "text"].includes(tag.name)) {
            geometry.push([
                tag.name,
                Object.fromEntries(
                    Object.entries(tag.attributes).filter(([name]) =>
                        [
                            "viewBox",
                            "x",
                            "y",
                            "width",
                            "height",
                            "d",
                            "points",
                        ].includes(name),
                    ),
                ),
            ]);
        }
    });
    parser.write(svg).close();
    return geometry;
}

test("fixed D2 verifies prelude layout, seeds, repeated vars, null and environment precedence", () => {
    const code = "a -> b\n";
    assert.deepEqual(
        raw(PRELUDE + code),
        raw(code, ["--layout=tala", "--tala-seeds=1,2,3"]),
    );
    assert.deepEqual(
        raw(PRELUDE + "vars: {d2-config: {layout-engine: elk}}\n" + code),
        raw(code, ["--layout=elk"]),
    );
    assert.deepEqual(raw(PRELUDE + "vars: null\n" + code), raw(code));
    assert.deepEqual(
        raw(PRELUDE + "vars: {d2-config: null}\n" + code),
        raw(PRELUDE + code),
    );
    assert.deepEqual(
        raw("vars: {d2-config: {layout-engine: elk}}\n" + code, [], {
            ...runtime.env,
            D2_LAYOUT: "dagre",
        }),
        raw(code, ["--layout=dagre"]),
    );
    assert.deepEqual(
        raw(PRELUDE + "vars: {d2-config: {layout-engine: elk}}\n" + code, [
            "--layout=dagre",
        ]),
        raw(code, ["--layout=dagre"]),
    );
    assert.throws(
        () =>
            raw("vars: {d2-config: {data: {tala-seeds: invalid}}}\n" + code, [
                "--layout=tala",
                "--tala-seeds=1",
            ]),
        (error) => /tala-seeds must be a list/.test(error.stderr),
    );
});

test("fixed D2 renders Japanese, long labels, math, groups and tall and wide diagrams", (t) => {
    const root = workspace(t);
    for (const [name, source] of Object.entries({
        japanese:
            "direction: right\nhuman: 人間\nrobot: 日本語の長いラベルを持つ共有ロボット\nhuman -> robot",
        math: "formula: |latex\nx^2 + \\alpha = \\frac{1}{2}\n|",
        group: "direction: right\nagent: {input: Input; output: Output; input -> output}\nresult: Result\nagent -> result",
        positioned: "a: Input\nb: Output\nb.near: a\na -> b",
        tall: "a -> b -> c -> d -> e",
        wide: "direction: right\na -> b -> c -> d -> e",
    })) {
        const svg = renderD2Sync(source, { salt: name });
        assert.match(svg, /<svg/);
        fs.writeFileSync(path.join(root, `${name}.svg`), svg);
    }
    assert.throws(
        () =>
            renderD2Sync("a: 日本語", {
                env: { ...process.env, MARP_AGENT_D2_FONT_PATH: "" },
                salt: "missing-font",
            }),
        /fonts lack glyph/,
    );
    assert.throws(
        () =>
            renderD2Sync("a: 日本語\nb: |md\n*日本語*\n|", {
                salt: "missing-italic",
            }),
        /fonts lack glyph/,
    );
    assert.match(
        renderD2Sync(
            "vars: {d2-config: {layout-engine: elk}}\na: |md\n*日本語*\n|",
            {
                env: {
                    ...process.env,
                    MARP_AGENT_D2_FONT_ITALIC_PATH:
                        process.env.MARP_AGENT_D2_FONT_PATH,
                },
                salt: "explicit-italic",
            },
        ),
        /<svg/,
    );
});

test("configured engine preserves measured labels, isolates repeated diagrams and reports source lines", () => {
    const code = "a: 日本語のラベル\nb: Output\na -> b";
    const result = createConfiguredMarp().render(
        `# D2\n\n\`\`\`d2\n${code}\n\`\`\`\n\n\`\`\`d2\n${code}\n\`\`\``,
    );
    assert.deepEqual(result.d2Diagnostics, []);
    assert.equal((result.html.match(/class="d2-diagram"/g) || []).length, 2);
    const ids = [...result.html.matchAll(/\bid="(marpagent-d2-[^"]+)"/g)].map(
        (match) => match[1],
    );
    assert.equal(ids.length, new Set(ids).size);
    assert.doesNotMatch(
        result.html.match(/<div class="d2-diagram"[\s\S]*?<\/div>/)[0],
        /\u200b|word-break/,
    );
    const failed = createConfiguredMarp().render(
        "# Broken\n\n```d2\na: {\n```",
    );
    assert.equal(failed.d2Diagnostics[0].line, 4);
    assert.throws(() => assertD2RenderSucceeded(failed.html), {
        code: "D2_RENDER_FAILED",
    });
});

test("HTML, PDF, PPTX, images and screenshot refuse D2 failure before replacing output", (t) => {
    const root = workspace(t);
    const deck = path.join(root, "slide.md");
    fs.writeFileSync(
        deck,
        "---\nmarp: true\n---\n# Broken\n```d2\na: {\n```\n",
    );
    for (const mode of ["html", "pdf", "pptx", "images", "screenshot"]) {
        const output = path.join(
            root,
            mode === "screenshot" || mode === "images"
                ? `${mode}.png`
                : `slide.${mode}`,
        );
        fs.writeFileSync(output, "keep existing output");
        const flags =
            mode === "screenshot"
                ? ["--screenshot", "1"]
                : mode === "images"
                  ? ["--images", "png"]
                  : [`--${mode}`];
        const result = spawnSync(
            process.execPath,
            ["bin/marpx.js", deck, ...flags, "--output", output],
            {
                cwd: path.resolve(__dirname, "../.."),
                env: {
                    ...process.env,
                    PLAYWRIGHT_BROWSERS_PATH: path.join(root, "no-browser"),
                },
                encoding: "utf8",
                timeout: 20000,
            },
        );
        assert.notEqual(result.status, 0, mode);
        assert.match(result.stderr, /D2/i, mode);
        assert.equal(
            fs.readFileSync(output, "utf8"),
            "keep existing output",
            mode,
        );
    }
    assert.deepEqual(
        fs.readdirSync(root).filter((name) => /\.(?:d2|svg)$/.test(name)),
        [],
    );
});

test("validation retains D2 failure when the browser cannot launch", async (t) => {
    const root = workspace(t);
    const deck = path.join(root, "slide.md");
    fs.writeFileSync(
        deck,
        "---\nmarp: true\n---\n# Broken\n```d2\na: {\n```\n",
    );
    const result = spawnSync(
        process.execPath,
        ["scripts/validate-deck.js", deck, "--format", "json"],
        {
            cwd: path.resolve(__dirname, "../.."),
            env: {
                ...process.env,
                PLAYWRIGHT_BROWSERS_PATH: path.join(root, "no-browser"),
            },
            encoding: "utf8",
            timeout: 20000,
        },
    );
    assert.notEqual(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.visualCheck.status, "skipped");
    assert.ok(
        report.findings.some(
            (finding) =>
                finding.ruleId === "diagram-render-error" &&
                finding.engine === "d2" &&
                finding.line === 6,
        ),
    );
});

test("compiled HTML and overview display offline without D2 and without SVG interference", async (t) => {
    const root = workspace(t);
    const output = path.join(root, "slide.html");
    const result = spawnSync(
        process.execPath,
        [
            "bin/marpx.js",
            "fixtures/d2-components.md",
            "--html",
            "--output",
            output,
        ],
        {
            cwd: path.resolve(__dirname, "../.."),
            encoding: "utf8",
            timeout: 30000,
        },
    );
    assert.equal(result.status, 0, result.stderr);
    const html = fs.readFileSync(output, "utf8");
    assertD2RenderSucceeded(html);
    assert.ok(!html.includes(runtime.executable));
    const {
        extractSlides,
        buildOverviewDocument,
    } = require("../../src/overview-preview");
    assert.equal(extractSlides(html).length, 3);
    const overview = buildOverviewDocument(html, {});
    const overviewPath = path.join(root, "overview.html");
    fs.writeFileSync(overviewPath, overview);
    const { chromium } = require("playwright");
    const browser = await chromium.launch({ headless: true });
    t.after(() => browser.close());
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    for (const filename of [output, overviewPath]) {
        await page.goto(pathToFileURL(filename).href);
        await page.evaluate(() => document.fonts.ready);
        const state = await page.evaluate(() => {
            const diagrams = [...document.querySelectorAll(".d2-diagram")];
            return {
                count: diagrams.length,
                fonts: diagrams.every((diagram) =>
                    [...diagram.querySelectorAll("text")].every((text) =>
                        document.fonts.check(
                            `${getComputedStyle(text).fontSize} ${getComputedStyle(text).fontFamily}`,
                        ),
                    ),
                ),
                sizes: diagrams.flatMap((diagram) =>
                    [...diagram.querySelectorAll("text")].map(
                        (text) => getComputedStyle(text).fontSize,
                    ),
                ),
                widths: diagrams.map(
                    (diagram) =>
                        diagram.querySelector("svg").getBoundingClientRect()
                            .width <=
                        diagram.getBoundingClientRect().width + 1,
                ),
                nodeBounds: diagrams.every((diagram) =>
                    [...diagram.querySelectorAll("text")].every((text) => {
                        const shape = text.parentElement.querySelector(
                            ":scope > .shape rect",
                        );
                        if (!shape) return true;
                        const label = text.getBoundingClientRect();
                        const box = shape.getBoundingClientRect();
                        return (
                            label.top >= box.top - 1 &&
                            label.bottom <= box.bottom + 1 &&
                            label.left >= box.left - 1 &&
                            label.right <= box.right + 1
                        );
                    }),
                ),
            };
        });
        assert.equal(state.count, 4);
        assert.equal(state.fonts, true);
        assert.ok(
            state.sizes.every((size) => size !== "80px"),
            "slide typography must not replace D2 label metrics",
        );
        assert.ok(state.widths.every(Boolean));
        assert.equal(
            state.nodeBounds,
            true,
            "measured Japanese labels must remain inside their node boxes",
        );
    }
});
