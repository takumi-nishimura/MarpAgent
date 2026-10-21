const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { exportPortableBundle } = require("../../src/portable-export");

function setup(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "portable-export-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const deckPath = path.join(root, "slide.md");
    fs.writeFileSync(deckPath, "# One\n");
    return {
        deckPath,
        repoRoot: root,
        outputPath: path.join(root, "deck.zip"),
    };
}

test("dry-run compiles HTML once through the common config and writes no archive", (t) => {
    const options = setup(t);
    let conversions = 0;
    let temporary;
    const result = exportPortableBundle({
        ...options,
        dryRun: true,
        convert(command, args) {
            conversions += 1;
            assert.match(command, /marp/);
            assert.ok(args.includes("--config"));
            assert.ok(args.some((v) => v.endsWith("marp.config.js")));
            assert.ok(!args.includes("--template"));
            temporary = args[args.indexOf("-o") + 1];
            fs.writeFileSync(temporary, "<section>visible citation</section>");
        },
    });
    assert.equal(conversions, 1);
    assert.deepEqual(result.errors, []);
    assert.equal(fs.existsSync(options.outputPath), false);
    assert.equal(fs.existsSync(path.dirname(temporary)), false);
});

test("conversion and configured-engine diagnostics preserve existing ZIP and clean the render stage", (t) => {
    const options = setup(t);
    fs.writeFileSync(options.outputPath, "existing ZIP");
    let temporary;
    let conversions = 0;
    assert.throws(
        () =>
            exportPortableBundle({
                ...options,
                force: true,
                convert(_command, args) {
                    conversions += 1;
                    temporary = args[args.indexOf("-o") + 1];
                    fs.writeFileSync(
                        temporary,
                        '<section data-marpagent-render-error="d2"></section>',
                    );
                },
                assertRenderSucceeded(html) {
                    assert.match(html, /data-marpagent-render-error="d2"/);
                    const error = new Error("D2 failed");
                    error.code = "D2_RENDER_FAILED";
                    throw error;
                },
            }),
        { code: "D2_RENDER_FAILED" },
    );
    assert.equal(conversions, 1);
    assert.equal(fs.existsSync(path.dirname(temporary)), false);
    assert.equal(fs.readFileSync(options.outputPath, "utf8"), "existing ZIP");
    assert.throws(
        () =>
            exportPortableBundle({
                ...options,
                force: true,
                convert() {
                    throw new Error("configured engine failed");
                },
            }),
        /configured engine failed/,
    );
    assert.equal(fs.readFileSync(options.outputPath, "utf8"), "existing ZIP");
});
