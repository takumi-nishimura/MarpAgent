const test = require("node:test");
const assert = require("node:assert/strict");
const { createConfiguredMarp } = require("../../src/slide-map");
const { parseDocument } = require("htmlparser2");
function columns(shares) {
    const source =
        '<div class="col shares">\n' +
        shares
            .map(
                (value) =>
                    `<div${value === null ? "" : ` style="--col-share:${value}"`}>Column</div>`,
            )
            .join("\n") +
        "\n</div>";
    const { html } = createConfiguredMarp().render(source);
    const nodes = [];
    function walk(n) {
        if ((n.attribs?.class || "").split(/\s+/).includes("shares"))
            nodes.push(n);
        (n.children || []).forEach(walk);
    }
    walk(parseDocument(html));
    return nodes[0].attribs.style || "";
}
test("shares allocate the remainder to any number of unspecified columns", () => {
    for (const [input, expected] of [
        [
            [0.6, null],
            [0.6, 0.4],
        ],
        [
            [0.5, null, null],
            [0.5, 0.25, 0.25],
        ],
        [
            [0.5, 0.3, null],
            [0.5, 0.3, 0.2],
        ],
        [
            [null, null, null, null],
            [0.25, 0.25, 0.25, 0.25],
        ],
    ]) {
        const style = columns(input);
        const values = [...style.matchAll(/minmax\(0, ([\d.]+)fr\)/g)].map(
            (m) => Number(m[1]),
        );
        assert.equal(values.length, expected.length);
        values.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-8));
    }
});
test("invalid shares fail explicitly instead of silently changing proportions", () => {
    for (const input of [
        [0.8, 0.4, null],
        [-0.1, null],
        ["bad", null],
        [1, null],
        [0.2, 0.2],
    ])
        assert.throws(() => columns(input), /column share/i);
});
test("nested layouts resolve independently and preserve escaped attributes and content", () => {
    const { html } = createConfiguredMarp().render(
        '<div class="col shares" title="a &amp; b &gt; c"><div class="col shares" style="--col-share:.5"><div>A</div><div>B</div><div>C</div></div><!-- note --><div>D &amp; E</div></div>',
    );
    assert.equal((html.match(/grid-template-columns/g) || []).length, 2);
    assert.match(html, /minmax\(0, 0\.5fr\) minmax\(0, 0\.5fr\)/);
    assert.match(html, /minmax\(0, 0\.3333333333333333fr\)/);
    assert.match(html, /D &amp; E/);
    const titles = [];
    function collect(node) {
        if (node.attribs?.title) titles.push(node.attribs.title);
        (node.children || []).forEach(collect);
    }
    collect(parseDocument(html));
    assert.deepEqual(titles, ["a & b > c"]);
});
test("legacy columns retain explicit weights and unspecified markup", () => {
    const { html } = createConfiguredMarp().render(
        '<div class="col visual" style="--visual-left:.9"><div>A</div><div>B</div></div>',
    );
    assert.doesNotMatch(html, /grid-template-columns/);
    assert.match(html, /--visual-left:.9/);
});
