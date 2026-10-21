const test = require("node:test");
const assert = require("node:assert/strict");
const {
    collectClassDefinitions,
    findClassFindings,
} = require("../../src/class-diagnostics");

test("CSS inventory parses compound, nested, escaped and attribute selectors", () => {
    const result = collectClassDefinitions(String.raw`
    @layer components {
      section.col.visual > :is(.local, .other):not(.excluded) {
        color: red;
        & > .nested { color: blue; }
      }
      .hover\:highlight:hover, .w-1\/2, .e\.1::before { color: red; }
      [class~="attribute"], [class="exact pair"] { color: green; }
    }
  `);
    assert.deepEqual([...result.classes].sort(), [
        "attribute",
        "col",
        "e.1",
        "exact",
        "excluded",
        "hover:highlight",
        "local",
        "nested",
        "other",
        "pair",
        "visual",
        "w-1/2",
    ]);
    assert.deepEqual(result.unknownReasons, []);
});

test("CSS comments, declarations, strings, parts and URLs do not define classes", () => {
    const result = collectClassDefinitions(`
    /* .comment */
    .known::part(part-name) { content: "/* .string */"; background: url(".asset/image.png"); }
    .after { color: red; }
  `);
    assert.deepEqual([...result.classes].sort(), ["after", "known"]);
    assert.deepEqual(result.unknownReasons, []);
});

test("imports, non-enumerable class selectors and broken CSS remain unknown", () => {
    assert.ok(
        collectClassDefinitions('@import "extra.css";').unknownReasons.includes(
            "external-css",
        ),
    );
    assert.ok(
        collectClassDefinitions(
            '[class^="dynamic-"] { color: red; }',
        ).unknownReasons.includes("class-selector-pattern"),
    );
    const broken = collectClassDefinitions(
        "@media screen { .broken { color: red; }",
    );
    assert.deepEqual([...broken.classes], []);
    assert.ok(broken.unknownReasons.includes("css-parse-error"));
});

test("undefined utilities and typos are hints with nearby defined candidates", () => {
    const findings = findClassFindings(
        '<div class="grid gap-5 itmes-center">A</div>',
        {
            themeCss: ".grid {} .gap-4 {} .items-center {}",
        },
    );
    assert.deepEqual(
        findings.map((finding) => finding.className),
        ["gap-5", "itmes-center"],
    );
    assert.deepEqual(
        findings.map((finding) => finding.ruleId),
        ["undefined-class", "undefined-class"],
    );
    assert.equal(findings[0].severity, "info");
    assert.equal(findings[0].source, "classes");
    assert.equal(findings[0].reason, "not-in-css");
    assert.deepEqual(findings[0].candidates, ["gap-4"]);
    assert.deepEqual(findings[1].candidates, ["items-center"]);
});

test("source extraction ignores code, notes, escaped tags and quoted class examples", () => {
    const markdown = [
        "```html",
        '<div class="fenced">',
        "```",
        "",
        "~~~html",
        '<div class="tilde">',
        "~~~",
        "",
        '    <div class="indented">',
        "",
        '`<i class="inline">` &lt;b class="escaped"&gt;',
        "",
        '<!-- <div class="note"> -->',
        "",
        "<script>const sample = '<div class=\"script-example\">';</script>",
        "",
        '<textarea><div class="text-example"></textarea>',
        "",
        '<b title="class=example >" data-class="data" class="actual">Text</b>',
    ].join("\n");
    const findings = findClassFindings(markdown, { themeCss: "" });
    assert.deepEqual(
        findings.map((finding) => finding.className),
        ["actual"],
    );
    assert.equal(findings[0].ruleId, "class-availability-unknown");
    assert.equal(findings[0].reason, "dynamic-content");
    assert.equal(findings[0].line, 19);
});

test("HTML attribute parsing handles quotes, entities, multiline tags and CR-only input", () => {
    const markdown =
        '<div title="class=wrong >"\r CLASS=\'local&#32;missing\'\r class="duplicate">A</div>';
    const findings = findClassFindings(markdown, { themeCss: ".local {}" });
    assert.deepEqual(
        findings.map((finding) => [finding.className, finding.line]),
        [["missing", 2]],
    );
});

test("deck CSS definitions include front matter, active style directive and compound selectors", () => {
    const markdown = [
        "---",
        "theme: lab",
        "style: |",
        "  .front { color: red; }",
        "---",
        "<style>",
        ".col.local > :is(.child, .marker) {}",
        "</style>",
        "",
        '<div class="front col local child marker">A</div>',
    ].join("\n");
    assert.deepEqual(findClassFindings(markdown, { themeCss: ".col {}" }), []);
    const changed = markdown + '\n\n<!-- style: ".replacement {}" -->\n';
    assert.deepEqual(
        findClassFindings(changed, { themeCss: ".col {}" }).map(
            (finding) => finding.className,
        ),
        ["front"],
    );
});

test("scoped definitions are available only on their owning slide", () => {
    const markdown =
        '<style scoped>.local { color: red; }</style>\n\n<div class="local">A</div>\n\n---\n\n<div class="local">B</div>';
    const findings = findClassFindings(markdown, { themeCss: "" });
    assert.deepEqual(
        findings.map((finding) => [
            finding.className,
            finding.slide,
            finding.line,
        ]),
        [["local", 2, 7]],
    );
});

test("external, dynamic and unparsable inputs stay unknown without hiding known classes", () => {
    for (const [prefix, reason] of [
        ['<link rel="stylesheet" href="extra.css">', "external-css"],
        [
            '<style>@import "https://cdn.example.test/extra.css";</style>',
            "external-css",
        ],
        [
            "<style>@media screen { .broken { color: red; }</style>",
            "css-parse-error",
        ],
        ['<script src="example.js"></script>', "dynamic-content"],
    ]) {
        const findings = findClassFindings(
            `${prefix}\n\n<div class="known custom">A</div>`,
            { themeCss: ".known {}" },
        );
        assert.deepEqual(
            findings.map((finding) => finding.className),
            ["custom"],
        );
        assert.equal(findings[0].ruleId, "class-availability-unknown");
        assert.equal(findings[0].reason, reason);
        assert.deepEqual(findings[0].candidates, []);
    }
});

test("dynamic attributes are unknown and literal classes in the same element still work", () => {
    const findings = findClassFindings(
        '<div class="known" :class="mode">A</div>\n<span class="{{ dynamic }}">B</span>',
        { themeCss: ".known {}" },
    );
    assert.deepEqual(
        findings.map((finding) => [finding.className, finding.reason]),
        [
            ["mode", "dynamic-class"],
            ["{{ dynamic }}", "dynamic-class"],
        ],
    );
    assert.ok(
        findings.every(
            (finding) => finding.ruleId === "class-availability-unknown",
        ),
    );
});

test("original lines and displayed pages follow the existing slide map, including hidden slides", () => {
    const markdown = [
        "---",
        "theme: lab",
        "paginate: true",
        "headingDivider: 2",
        "---",
        "<!-- _paginate: skip -->",
        "## Cover",
        "",
        "## Hidden",
        "<!-- _hide: true -->",
        '<b class="hidden-marker">A</b>',
        "",
        "## Visible",
        '<b class="missing">B</b>',
    ].join("\r\n");
    const findings = findClassFindings(markdown, { themeCss: "" });
    assert.deepEqual(
        findings.map(({ className, slide, renderedSlide, page, line }) => ({
            className,
            slide,
            renderedSlide,
            page,
            line,
        })),
        [
            {
                className: "hidden-marker",
                slide: 2,
                renderedSlide: null,
                page: null,
                line: 11,
            },
            {
                className: "missing",
                slide: 3,
                renderedSlide: 2,
                page: 1,
                line: 14,
            },
        ],
    );
});

test("authored class directives use their original declaration line and ignore generated classes", () => {
    const markdown = [
        "---",
        "theme: lab",
        "class: normal declared",
        "---",
        "# One",
        "",
        "---",
        "",
        "<!-- _class: local -->",
        "# Two",
        "",
        "---",
        "",
        "# Three",
    ].join("\n");
    const findings = findClassFindings(markdown, { themeCss: ".local {}" });
    assert.deepEqual(
        findings.map((finding) => [
            finding.className,
            finding.slide,
            finding.line,
        ]),
        [
            ["declared", 1, 3],
            ["declared", 3, 3],
        ],
    );
});

test("the active compiled theme defines classes without a per-deck build", () => {
    for (const theme of ["lab", "muji", "toshiba"]) {
        const markdown = `---\ntheme: ${theme}\n---\n<div class="col visual place-center grid itmes-center">A</div>`;
        const findings = findClassFindings(markdown);
        assert.deepEqual(
            findings.map((finding) => finding.className),
            ["itmes-center"],
        );
        assert.equal(findings[0].ruleId, "undefined-class");
        assert.ok(findings[0].candidates.includes("items-center"));
    }
});

test("unavailable themes do not imply that authored classes are undefined", () => {
    const findings = findClassFindings(
        '---\ntheme: missing-theme\n---\n<div class="grid">A</div>',
    );
    assert.equal(findings[0].ruleId, "class-availability-unknown");
    assert.equal(findings[0].reason, "theme-unavailable");
});

test("only HTML ASCII whitespace separates class tokens", () => {
    const findings = findClassFindings('<b class="alpha&nbsp;beta">Text</b>', {
        themeCss: String.raw`.alpha\a0 beta { color: red; }`,
    });
    assert.deepEqual(findings, []);
});

test("inline HTML in lists and quotes retains the original use lines", () => {
    const source =
        'Intro <b class="inline-missing">X</b>\n\n> Text <i class="quote-missing">Y</i>\n\n- Item <span class="list-missing">Z</span>';
    const findings = findClassFindings(source, { themeCss: "" });
    assert.deepEqual(
        findings.map(({ className, line }) => [className, line]),
        [
            ["inline-missing", 1],
            ["quote-missing", 3],
            ["list-missing", 5],
        ],
    );
});

test("the bundled font import exemption never applies to deck imports", () => {
    const source =
        '---\ntheme: lab\n---\n<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap");</style>\n\n<div class="missing">Text</div>';
    const findings = findClassFindings(source);
    assert.equal(findings[0].ruleId, "class-availability-unknown");
    assert.equal(findings[0].reason, "external-css");
});

test("class presence selectors are not enumerable definitions", () => {
    const findings = findClassFindings('<b class="marker">Text</b>', {
        themeCss: "[class] { color: red; }",
    });
    assert.equal(findings[0].ruleId, "class-availability-unknown");
    assert.equal(findings[0].reason, "class-selector-pattern");
});
