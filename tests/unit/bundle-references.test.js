const test = require("node:test");
const assert = require("node:assert/strict");
const { rewriteReferences } = require("../../src/bundle-references");

function rewrite(source, kind = "html") {
    const references = [];
    const result = rewriteReferences(source, {
        kind,
        onReference(value, context) {
            references.push({ value, ...context });
            return value.startsWith("#") || value.startsWith("data:")
                ? value
                : `packed/${value}`;
        },
    });
    return { ...result, references };
}

test("rewrites real media attributes with entities and preserves scripts, comments, citations and tag casing", () => {
    const source = `<section><img title="src='fake.png'" src="a&amp;b.png"><svg viewBox="0 0 1 1"><image xlink:href="外部 image.png"/><use href="#local"/></svg><script>const sample='<img src="fake.png">';</script><!-- <img src="fake.png"> --><a href="citation.pdf">Source</a></section>`;
    const result = rewrite(source);
    assert.deepEqual(
        result.references.map((r) => r.value),
        ["a&b.png", "外部 image.png", "#local"],
    );
    assert.ok(result.references.every((r) => r.page === 1));
    assert.match(result.content, /src="packed\/a&amp;b.png"/);
    assert.match(result.content, /viewBox=/);
    assert.match(
        result.content,
        /<script>const sample='<img src="fake.png">';<\/script>/,
    );
    assert.match(result.content, /href="citation.pdf"/);
});

test("CSS imports and URL escapes use parsed values while strings and comments stay untouched", () => {
    const source =
        '@import "nested/theme.css?x=1#y" screen; .x{background:URL("a b).png"),url(escape\\20 name.png);content:"url(fake.png)"} /* url(no.png) */';
    const result = rewrite(source, "css");
    assert.deepEqual(
        result.references.map((r) => r.value),
        ["nested/theme.css?x=1#y", "a b).png", "escape name.png"],
    );
    assert.match(result.content, /content:"url\(fake.png\)"/);
    assert.match(result.content, /\/\* url\(no.png\) \*\//);
    assert.match(result.content, /packed\/escape name.png/);
});

test("handles inline CSS, media source/poster, preload, srcset data commas, and section identity", () => {
    const result = rewrite(
        '<style>.global{background:url(global.png)}</style><section><video src="clip.webm" poster="poster.png"><source src="alt.webm"></video><audio src="a.wav"></audio><img srcset="data:image/png;base64,aA== 1x, two.png 2x"><div style="background:url(&quot;inline image.png&quot;)"></div></section><section><link rel="preload" href="font.woff2" as="font"><script src="app.js"></script></section>',
    );
    assert.deepEqual(
        result.references.map((r) => r.value),
        [
            "global.png",
            "clip.webm",
            "poster.png",
            "alt.webm",
            "a.wav",
            "data:image/png;base64,aA==",
            "two.png",
            "inline image.png",
            "font.woff2",
            "app.js",
        ],
    );
    assert.equal(result.references[0].page, null);
    assert.equal(result.references.at(-1).page, 2);
    assert.match(
        result.content,
        /data:image\/png;base64,aA== 1x, packed\/two.png 2x/,
    );
    assert.match(result.content, /&quot;packed\/inline image.png&quot;/);
});

test("SVG processing preserves case, IDs and internal fragments", () => {
    const result = rewrite(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><defs><clipPath id="Clip"/></defs><image href="image.png"/><use xlink:href="other.svg#shape"/><path fill="url(#Clip)"/><feImage href="filter.png"/></svg>',
        "svg",
    );
    assert.deepEqual(
        result.references.map((r) => r.value),
        ["image.png", "other.svg#shape", "#Clip", "filter.png"],
    );
    assert.match(result.content, /clipPath id="Clip"/);
    assert.match(result.content, /viewBox=/);
    assert.match(result.content, /fill="url\(#Clip\)"/);
});
