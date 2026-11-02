const test = require("node:test");
const assert = require("node:assert/strict");
const { createConfiguredMarp } = require("../../src/slide-map");
const { parseDocument } = require("htmlparser2");
const { findAll, textContent } = require("domutils");
function slides(source) {
    const doc = parseDocument(createConfiguredMarp().render(source).html);
    return findAll((n) => n.name === "section", doc.children);
}
const bodies = (s) =>
    s.children.filter((n) => n.attribs?.class?.split(/\s+/).includes("body"));
test("ordinary Markdown gains one body after only the leading heading", () => {
    const [s] = slides("## Title\n\nText\n\n### Detail\n\n- Item");
    assert.equal(bodies(s).length, 1);
    assert.equal(
        s.children.find((n) => n.name === "h2").children[0].data,
        "Title",
    );
    assert.match(textContent(bodies(s)[0]), /Text.*Detail.*Item/s);
    const [noTitle] = slides("Text\n\n## Later heading");
    assert.match(textContent(bodies(noTitle)[0]), /Text.*Later heading/s);
});
test("deck opt-out, spot override, title, paper and scroll retain their structures", () => {
    assert.equal(
        bodies(slides("---\nautoBody: false\n---\n## Legacy\n\nText")[0])
            .length,
        0,
    );
    const ss = slides(
        [
            "<!-- _autoBody: false -->\n\n## Manual\n\nText",
            "<!-- _class: title -->\n\n# Title",
            '<div class="paper-header">Paper</div>\n\nText',
            "<!-- _scroll: true -->\n\n## Scroll\n\nText",
            "## Auto again\n\nText",
        ].join("\n\n---\n\n"),
    );
    assert.deepEqual(
        ss.map((s) => bodies(s).length),
        [0, 0, 0, 0, 1],
    );
});
test("explicit layouts, marginal elements and nested HTML survive", () => {
    const [s] = slides(
        '<!-- _header: Context -->\n<!-- _footer: Footer -->\n\n## Title\n\n<div class="body col">\n\n<div>\n\nText\n\n</div>\n\n</div>',
    );
    assert.equal(bodies(s).length, 1);
    assert.equal(bodies(s)[0].attribs.class, "body col");
    assert.ok(s.children.some((n) => n.name === "header"));
    assert.ok(s.children.some((n) => n.name === "footer"));
    const [auto] = slides(
        '<!-- _header: Context -->\n<!-- _footer: Footer -->\n\n## Title\n\n<div>\n\nNested\n\n</div>\n\n```html\n<div class="body">\n```',
    );
    assert.equal(bodies(auto).length, 1);
    assert.ok(auto.children.some((n) => n.name === "header"));
    assert.ok(auto.children.some((n) => n.name === "footer"));
});

test("deck opt-out inherits while a spot opt-in affects only one slide", () => {
    const ss = slides(
        "---\nautoBody: false\n---\n" +
            [
                "## Manual\n\nText",
                "<!-- _autoBody: true -->\n\n## Automatic\n\nText",
                "## Manual again\n\nText",
            ].join("\n\n---\n\n"),
    );
    assert.deepEqual(
        ss.map((s) => bodies(s).length),
        [0, 1, 0],
    );
});
