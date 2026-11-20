const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDocument, DomUtils } = require("htmlparser2");
const { createConfiguredMarp } = require("../../src/slide-map");

const toc = "<!-- _toc: true -->\n## Agenda";
function render(pages, engine = createConfiguredMarp()) {
    const { html } = engine.render(pages.join("\n\n---\n\n"));
    const nodes = parseDocument(html).children;
    const text = node => DomUtils.textContent(node).replaceAll("\u200b", "");
    return {
        lists: DomUtils.findAll(n => n.attribs.class === "section-contents", nodes)
            .map(list => list.children.map(text)),
        headers: DomUtils.findAll(n => n.name === "header", nodes).map(text),
    };
}

test("inherited and spot headers form ordered runs across visible content pages", () => {
    const pages = [
        "<!-- _class: title -->\n<!-- _header: Date -->\n# Talk", toc,
        "<!-- header: '**Background** &amp; context' -->\n## Why",
        "## A different heading",
        "<!-- _header: Methods -->\n## Design",
        "<!-- hide: true -->\n<!-- _header: Hidden -->\n## Hidden",
        "## Back to context", toc,
    ];
    assert.deepEqual(render(pages).lists, Array(2).fill(["Background & context", "Methods", "Background & context"]));
});

test("one explicit section switches the whole deck; local headers can vary", () => {
    const pages = [toc, "<!-- _header: Preface -->\n## Intro",
        "<!-- section: Study -->\n## Apparatus",
        "<!-- _header: Participants -->\n## Recruitment",
        "<!-- hide: true -->\n<!-- section: Results -->", "## Findings",
        '<!-- section: "" -->\n<!-- _header: Questions -->\n## End'];
    const result = render(pages);
    assert.deepEqual(result.lists, [["Study", "Results"]]);
    assert.deepEqual(result.headers, ["Preface", "Study", "Participants", "Results", "Questions"]);
});

test("hidden-only sections govern the source but contribute no entries; a later render starts fresh", () => {
    const engine = createConfiguredMarp();
    assert.deepEqual(render([toc, "<!-- _header: Preface -->", "<!-- hide: true -->\n<!-- section: Hidden -->"], engine).lists, []);
    assert.deepEqual(render([toc, "## Heading only"], engine).lists, []);
    assert.deepEqual(render([toc, "<!-- header: 'A &amp; B' -->", "## Next"], engine).lists, [["A & B"]]);
});

test("chapter labels remain literal and reappearing chapters keep their position", () => {
    const label = "A <b> & *B*";
    const pages = [toc, `<!-- section: '${label}' -->`, "## Next",
        "<!-- section: Another -->", `<!-- section: '${label}' -->`];
    assert.deepEqual(render(pages).lists, [[label, "Another", label]]);
    assert.equal(render(pages).headers[0], label);
});
