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
            fs.writeFileSync(
                temporary,
                '<section>visible citation<div class="d2-diagram" data-marpagent-d2="true"><svg></svg></div></section>',
            );
        },
    });
    assert.equal(conversions, 1);
    assert.deepEqual(result.errors, []);
    assert.equal(result.manifest.renderer.d2, "0.9.0");
    assert.equal(fs.existsSync(options.outputPath), false);
    assert.equal(fs.existsSync(path.dirname(temporary)), false);
});

test("ZIP conversion retains the original D2 project context and requests strict rendering without mutating caller environment", (t) => {
    const options = setup(t);
    for (const project of [
        undefined,
        path.join(options.repoRoot, "explicit-project"),
    ]) {
        const env = {
            UNRELATED: "preserved",
            MARP_AGENT_D2_STRICT: "0",
            ...(project ? { MARP_AGENT_D2_CWD: project } : {}),
        };
        const before = { ...env };
        let conversions = 0;
        exportPortableBundle({
            ...options,
            env,
            dryRun: true,
            convert(_command, args, context) {
                conversions += 1;
                assert.equal(
                    context.env.MARP_AGENT_D2_CWD,
                    project || path.dirname(options.deckPath),
                );
                assert.equal(context.env.MARP_AGENT_D2_STRICT, "1");
                assert.equal(context.env.UNRELATED, "preserved");
                fs.writeFileSync(
                    args[args.indexOf("-o") + 1],
                    "<section>public</section>",
                );
            },
        });
        assert.equal(conversions, 1);
        assert.deepEqual(env, before);
    }
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
                        '<pre data-marpagent-render-error="d2" data-marpagent-render-code="D2_COMPILE_FAILED" data-marpagent-render-message="Fixture error" data-marpagent-source-line="7" data-marpagent-source-slide="2"></pre>',
                    );
                },
                assertRenderSucceeded() {},
            }),
        {
            code: "D2_RENDER_FAILED",
            diagnostics: [
                {
                    engine: "d2",
                    code: "D2_COMPILE_FAILED",
                    message: "Fixture error",
                    line: 7,
                    slide: 2,
                },
            ],
        },
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
