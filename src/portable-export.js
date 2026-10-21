const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runConversionSync } = require("./conversion-runtime");
const { getMarpBin } = require("./preview-runtime");
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
            { cwd: toolRoot },
        );
        const html = fs.readFileSync(htmlPath, "utf8");
        if (assertRenderSucceeded) assertRenderSucceeded(html);
        else {
            // The optional D2 adapter adds this shared policy at integration time.
            const diagnosticsModule = path.join(__dirname, "d2-diagnostics.js");
            if (fs.existsSync(diagnosticsModule))
                require(diagnosticsModule).assertD2RenderSucceeded(html);
        }
        const plan = planPortableBundle({
            html,
            deckPath: deck,
            repoRoot: repoRoot || toolRoot,
            strictOffline,
            maxFiles,
            maxBytes,
        });
        if (!dryRun && plan.errors.length === 0)
            writePortableBundle(plan, { outputPath: output, force });
        return { ...plan, outputPath: output, dryRun };
    } finally {
        fs.rmSync(stage, { recursive: true, force: true });
    }
}

module.exports = { exportPortableBundle };
