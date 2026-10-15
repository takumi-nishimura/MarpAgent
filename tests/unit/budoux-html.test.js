const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { Marp } = require("@marp-team/marp-core/full");

const configPath = path.join(__dirname, "../..", "marp.config.js");

function freshMarp() {
    delete require.cache[path.resolve(configPath)];
    const config = require(configPath);
    const marp = new Marp({ html: config.html ?? true });
    return typeof config.engine === "function"
        ? config.engine({ marp }) || marp
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
