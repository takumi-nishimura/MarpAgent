const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { Marp } = require("@marp-team/marp-core");

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
