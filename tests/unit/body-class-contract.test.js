const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { findClassFindings } = require("../../src/class-diagnostics");
const {
    exitCodeFor,
    validateDeckMarkdown,
} = require("../../src/deck-validator");

const repoRoot = path.join(__dirname, "../..");

for (const theme of ["lab", "muji", "toshiba"]) {
    test(`${theme}: body components are available and misspellings remain advisory`, () => {
        const source = [
            "---",
            `theme: ${theme}`,
            "paginate: true",
            "---",
            "# Components",
            "",
            '<div class="body col visual" style="--visual-left: 2; --visual-right: 1">',
            '<div class="place-middle"><figure class="figure-natural"><figcaption>Caption</figcaption></figure></div>',
            '<div class="place-bottom">Context</div>',
            "</div>",
            "",
            "---",
            "",
            "# Misspellings",
            "",
            '<div class="boddy"><figure class="figure-natual">Text</figure></div>',
        ].join("\n");
        const findings = findClassFindings(source);
        assert.deepEqual(
            findings.map(({ className }) => className),
            ["boddy", "figure-natual"],
        );
        for (const [finding, candidate] of findings.map((finding, index) => [
            finding,
            ["body", "figure-natural"][index],
        ])) {
            assert.equal(finding.ruleId, "undefined-class");
            assert.equal(finding.severity, "info");
            assert.equal(finding.line, 16);
            assert.equal(finding.slide, 2);
            assert.equal(finding.renderedSlide, 2);
            assert.equal(finding.page, 2);
            assert.ok(finding.candidates.includes(candidate));
        }
        assert.equal(exitCodeFor(validateDeckMarkdown(source)), 0);
        const css = fs.readFileSync(
            path.join(repoRoot, "themes", `${theme}.css`),
            "utf8",
        );
        for (const name of [
            "body-top-gap",
            "body-bottom-safe",
            "body-gap",
            "col-gap",
            "figure-gap",
            "visual-left",
            "visual-right",
        ]) {
            assert.match(css, new RegExp(`--${name}\\s*[:,]`));
        }
    });

    test(`${theme}: imported body fixture uses only available classes`, () => {
        const source = fs
            .readFileSync(
                path.join(repoRoot, "fixtures/body-layout-slide.md"),
                "utf8",
            )
            .replace("theme: lab", `theme: ${theme}`);
        assert.deepEqual(findClassFindings(source), []);
    });
}
