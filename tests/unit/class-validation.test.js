const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
    buildSarifReport,
    countFindings,
    exitCodeFor,
    formatSummary,
    validateDeckFile,
    validateDeckMarkdown,
    validateDeckWithVisualCheck,
} = require("../../src/deck-validator");

const markdown =
    '---\ntheme: lab\npaginate: true\n---\n# Example\n\n<div class="itmes-center">Text</div>\n';

test("class diagnostics are non-blocking hints in source-only validation", () => {
    const result = validateDeckMarkdown(markdown);
    const finding = result.findings.find(
        (item) => item.ruleId === "undefined-class",
    );
    assert.ok(finding);
    assert.equal(finding.className, "itmes-center");
    assert.equal(finding.line, 7);
    assert.equal(finding.page, 1);
    assert.equal(finding.severity, "info");
    assert.equal(exitCodeFor(result), 0);
    assert.deepEqual(countFindings(result.findings), {
        errors: 0,
        warnings: 0,
        hints: 1,
    });
    assert.doesNotMatch(formatSummary(null, result), /undefined-class:/);
    assert.match(
        formatSummary(null, result, { showHints: true }),
        /\[hint\] slide 1 undefined-class:.*line 7/,
    );
});

test("class advice retains original locations and metadata in JSON and SARIF reports", (t) => {
    const directory = fs.mkdtempSync(
        path.join(os.tmpdir(), "marp-class-validation-"),
    );
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const deckPath = path.join(directory, "slide.md");
    const reportDir = path.join(directory, "report");
    fs.writeFileSync(deckPath, markdown);
    let screenshotSlides;
    const result = validateDeckFile(deckPath, {
        reportDir,
        imageExporter: ({ slideNumbers }) => {
            screenshotSlides = slideNumbers;
            return [];
        },
    });
    const report = JSON.parse(
        fs.readFileSync(path.join(reportDir, "report.json"), "utf8"),
    );
    assert.equal(report.deckPath, deckPath);
    assert.equal(report.findings[0].line, 7);
    assert.equal(report.findings[0].reason, "not-in-css");
    assert.ok(report.findings[0].candidates.includes("items-center"));
    assert.deepEqual(screenshotSlides, []);
    assert.equal(fs.readFileSync(deckPath, "utf8"), markdown);
    const [finding] = buildSarifReport(deckPath, result).runs[0].results;
    assert.equal(finding.level, "note");
    assert.equal(finding.locations[0].physicalLocation.region.startLine, 7);
    assert.equal(
        finding.locations[0].physicalLocation.artifactLocation.uri,
        path.relative(process.cwd(), deckPath),
    );
    assert.equal(finding.properties.className, "itmes-center");
    assert.deepEqual(
        finding.properties.candidates,
        report.findings[0].candidates,
    );
});

test("class hints stay advisory after a measured render or a skipped render", async (t) => {
    const directory = fs.mkdtempSync(
        path.join(os.tmpdir(), "marp-class-render-"),
    );
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const deckPath = path.join(directory, "slide.md");
    fs.writeFileSync(deckPath, markdown);
    for (const measurement of [
        { status: "measured", slides: [] },
        { status: "skipped", reason: "test fixture" },
    ]) {
        const result = await validateDeckWithVisualCheck(deckPath, {
            measureRenderedSlides: async () => measurement,
        });
        const [finding] = result.findings.filter(
            (item) => item.ruleId === "undefined-class",
        );
        assert.ok(finding);
        assert.equal(finding.severity, "info");
        assert.equal(finding.line, 7);
        assert.equal(exitCodeFor(result), 0);
    }
});

test("paper decks retain class advice while skipping slide-density heuristics", () => {
    const result = validateDeckMarkdown(
        markdown.replace("theme: lab", "theme: lab\nsize: a4-portrait"),
    );
    assert.equal(result.paper, true);
    assert.deepEqual(
        result.findings.map((finding) => finding.ruleId),
        ["undefined-class"],
    );
});
