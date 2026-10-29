const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runConversionSync } = require("./conversion-runtime");
const { getMarpBin } = require("./preview-runtime");
const { assertD2RenderSucceeded } = require("./d2-diagnostics");
const { D2_VERSION } = require("./d2-render");
const {
    planPortableBundle,
    writePortableBundle,
} = require("./portable-bundle");

/** Reuse the configured HTML export once; failed conversion never reaches publication. */
function exportPortableBundle({
    deckPath,
    repoRoot,
    toolRoot = path.resolve(__dirname, ".."),
    outputPath,
    dryRun = false,
    force = false,
    strictOffline = false,
    maxFiles,
    maxBytes,
    env = process.env,
    assertRenderSucceeded,
    convert = runConversionSync,
} = {}) {
    const deck = path.resolve(deckPath);
    const output = path.resolve(
        outputPath || deck.replace(/\.[^.]+$/, "") + ".zip",
    );
    if (!dryRun && fs.existsSync(output) && !force)
        throw new Error(
            "Refusing to overwrite an existing output; use --force",
        );
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), "marp-bundle-render-"));
    try {
        const htmlPath = path.join(stage, "render.html");
        convert(
            getMarpBin(toolRoot),
            [
                "--config",
                path.join(toolRoot, "marp.config.js"),
                "--allow-local-files",
                "-o",
                htmlPath,
                deck,
            ],
            {
                cwd: toolRoot,
                env: {
                    ...env,
                    MARP_AGENT_D2_CWD:
                        env.MARP_AGENT_D2_CWD || path.dirname(deck),
                    MARP_AGENT_D2_STRICT: "1",
                },
            },
        );
        const html = fs.readFileSync(htmlPath, "utf8");
        assertD2RenderSucceeded(html);
        if (assertRenderSucceeded) assertRenderSucceeded(html);
        const plan = planPortableBundle({
            html,
            deckPath: deck,
            repoRoot: repoRoot || toolRoot,
            strictOffline,
            maxFiles,
            maxBytes,
            renderer: /\bdata-marpagent-d2=["']true["']/.test(html)
                ? { d2: D2_VERSION }
                : {},
        });
        if (!dryRun && plan.errors.length === 0)
            writePortableBundle(plan, { outputPath: output, force });
        return { ...plan, outputPath: output, dryRun };
    } finally {
        fs.rmSync(stage, { recursive: true, force: true });
    }
}

module.exports = { exportPortableBundle };
