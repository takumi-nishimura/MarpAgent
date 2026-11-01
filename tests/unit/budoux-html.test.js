const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { Marp } = require("@marp-team/marp-core/full");

const configPath = path.join(__dirname, "../..", "marp.config.js");

function freshMarp(options = {}) {
    delete require.cache[path.resolve(configPath)];
    const config = require(configPath);
    const marp = new Marp({ html: config.html ?? true, ...options });
    return typeof config.engine === "function"
        ? config.engine({ marp, ...options }) || marp
        : marp;
}

function renderBody(markdown) {
    const deck = `---
marp: true
---

${markdown}
`;
    const { html } = freshMarp().render(deck);
    return html;
}

test("wraps Japanese phrases on every CLI-style slide without adding a container", () => {
    const sentence = "`--overview`で，全ページの並びを確認できる．";
    const markdown = [1, 2, 3]
        .map((number) => `## Slide ${number}\n\n${sentence}`)
        .join("\n\n---\n\n");
    const { html } = freshMarp({
        inlineSVG: true,
        container: [],
        slideContainer: [],
    }).render(markdown);
    const paragraphs = [...html.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/g)]
        .map((match) => match[0]);

    assert.equal(paragraphs.length, 3);
    for (const paragraph of paragraphs) {
        assert.match(paragraph, /word-break:keep-all/);
        assert.match(paragraph, /全ページの\u200b並びを\u200b確認できる．/);
        assert.doesNotMatch(paragraph, /確認でき\u200bる/);
    }
    assert.ok(html.startsWith("<svg"), "The original slide roots must stay direct siblings.");
    assert.equal((html.match(/data-marpit-svg=/g) || []).length, 3);
});

test("keeps empty non-void HTML elements explicitly closed after BudouX", () => {
    const html = renderBody(
        '<div class="grid"><div style="height: 1em;"></div><div>次の要素</div></div>',
    );

    assert.match(html, /<div style="height: 1em;"><\/div>/);
    assert.doesNotMatch(html, /<div style="height: 1em;"\s*\/>/);
});

test("leaves HTML void elements self-closing after BudouX cleanup", () => {
    const html = renderBody('<div><br /><img src="x.png" alt="x" /></div>');

    assert.match(html, /<br\s*\/>/);
    assert.match(html, /<img src="x\.png" alt="x"\s*\/>/);
});

test("closes empty elements whose quoted attributes contain greater-than signs", () => {
    const html = renderBody('<div title="a > b /&gt;"></div>\n\nAfter');
    assert.match(html, /<div title="a > b \/>">\s*<\/div>/);
});

test("preserves Core 5 browser scripts through Japanese line breaking", () => {
    const upstreamHtml = new Marp({ html: true }).render("# Title").html;
    const scripts = upstreamHtml.match(/<script\b[^>]*>[\s\S]*?<\/script>/g);
    assert.ok(scripts?.length);
    const html = renderBody("# Title");
    for (const script of scripts) {
        assert.ok(html.includes(script), "Core browser script must remain unchanged");
    }
});

test("preserves raw scripts while wrapping Japanese body text", () => {
    const script = '<script>window.example = 1 < 2 && "<div/>";</script>';
    const html = renderBody(`${script}\n\n日本語の文章を改行する．`);
    assert.ok(html.includes(script));
    assert.ok(html.includes("\u200b"));
});

test("preserves generated Mermaid styles and attribute-bearing fences", () => {
    const markdown = '```mermaid interactive\nflowchart LR\nA --> B\n```';
    const upstreamHtml = new Marp({ html: true }).render(markdown).html;
    const styles = upstreamHtml.match(/<style\b[^>]*>[\s\S]*?<\/style>/g);
    assert.ok(styles?.length);
    const html = renderBody(markdown);
    assert.match(html, /data-marp-mermaid/);
    for (const style of styles) {
        assert.ok(html.includes(style), "Mermaid style must remain unchanged");
    }
});
