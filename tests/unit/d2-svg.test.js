const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { prepareD2Svg } = require("../../src/d2-svg");

const svg = (body, attributes = "") =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" ${attributes}>${body}</svg>`;

test("D2 SVG IDs, CSS selectors and local references are isolated together", () => {
    const input = svg(
        '<defs><marker id="arrow"/></defs><style>.shape{fill:red} #node{marker-end:url(#arrow)}</style><g id="node" class="shape"><use href="#node"/><text>Label</text></g>',
    );
    const first = prepareD2Svg(input, "first");
    const second = prepareD2Svg(input, "second");
    const firstRoot = /<svg[^>]* id="([^"]+)"/.exec(first)[1];
    assert.ok(first.includes(`#${firstRoot} .shape`));
    const nodeId = /<g id="([^"]+)"/.exec(first)[1];
    const markerId = /<marker id="([^"]+)"/.exec(first)[1];
    assert.ok(nodeId.startsWith(`${firstRoot}-`));
    assert.ok(first.includes(`href="#${nodeId}"`));
    assert.ok(first.includes(`#${firstRoot} #${nodeId}`));
    assert.ok(first.includes(`url(#${markerId})`));
    assert.ok(first.includes("Label"));
    assert.notEqual(first, second);
    assert.equal(prepareD2Svg(input, "first"), first);
});

test("D2 SVG rejects malformed roots, duplicate IDs and missing references", () => {
    for (const input of [
        "<svg>",
        "<html/>",
        svg("", 'onload="alert(1)"'),
        svg('<g id="x"/><g id="x"/>'),
        svg('<use href="#missing"/>'),
        "<!DOCTYPE svg><svg/>",
        svg("", 'viewBox="0 0 NaN 1"'),
    ]) {
        assert.throws(() => prepareD2Svg(input, "test"), /D2 SVG/);
    }
});

test("D2 SVG refuses active content and external resources in XML and CSS", () => {
    for (const body of [
        "<script>alert(1)</script>",
        "<foreignObject/>",
        "<animate/>",
        '<image href="https://example.com/x.svg"/>',
        '<a href="file:///tmp/x"/>',
        '<style>@import "https://example.com/x.css";</style>',
        "<style>.x{fill:url(https://example.com/x)}</style>",
        '<g style="fill:url(file:///tmp/x)"/>',
    ]) {
        assert.throws(() => prepareD2Svg(svg(body), "test"), /D2 SVG/);
    }
});

test("D2 SVG permits embedded font data and protects font family names", () => {
    const data = fs
        .readFileSync(
            path.join(
                __dirname,
                "../../node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff",
            ),
        )
        .toString("base64");
    const result = prepareD2Svg(
        svg(
            `<style>@font-face{font-family:diagram;src:url("data:application/font-woff;base64,${data}")} .text{font-family:diagram}</style><text class="text">Label</text>`,
        ),
        "font",
    );
    assert.match(result, /data:application\/font-woff;base64,/);
    assert.doesNotMatch(result, /font-family:diagram[;}]/);
});

test("missing non-Latin glyphs and broken embedded fonts fail explicitly", () => {
    assert.throws(
        () => prepareD2Svg(svg("<text>日本語</text>"), "glyph"),
        /fonts lack glyph/,
    );
    assert.throws(
        () =>
            prepareD2Svg(
                svg(
                    '<style>@font-face{font-family:x;src:url("data:application/font-woff;base64,AAAA")}</style>',
                ),
                "font",
            ),
        /invalid embedded font/,
    );
});
