const test = require("node:test");
const assert = require("node:assert/strict");
const { createConfiguredMarp } = require("../../src/slide-map");

function sectionsOf(markdown) {
    return [
        ...createConfiguredMarp()
            .render(markdown)
            .html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g),
    ].map((match) => match[0]);
}

test("the spot scroll directive wraps only its own slide", () => {
    const marp = createConfiguredMarp();
    const { html } = marp.render(
        "<!-- _scroll: true -->\n\n# Fixed title\n\nBody\n\n---\n\n# Normal\n\nBody",
    );
    const sections = [
        ...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g),
    ].map((match) => match[0]);
    assert.equal(sections.length, 2);
    assert.match(sections[0], /data-marpagent-scroll="true"/);
    assert.equal(
        (sections[0].match(/class="marpagent-scroll-body"/g) || []).length,
        1,
    );
    assert.match(sections[0], /tabindex="0"/);
    assert.match(sections[0], /role="region" aria-label="Slide content"/);
    assert.match(sections[0], /<\/h1>\s*<div class="marpagent-scroll-body"/);
    assert.doesNotMatch(sections[1], /marpagent-scroll/);
});

test("local inheritance and spot overrides use Marpit semantics", () => {
    const sections = sectionsOf(
        [
            "<!-- scroll: true -->\n\n# One\n\nBody",
            "<!-- _scroll: false -->\n\n# Two\n\nBody",
            "# Three\n\nBody",
            "<!-- scroll: false -->\n\n# Four\n\nBody",
            "# Five\n\nBody",
        ].join("\n\n---\n\n"),
    );
    assert.deepEqual(
        sections.map((section) =>
            section.includes('data-marpagent-scroll="true"'),
        ),
        [true, false, true, false, false],
    );
});

test("fenced, escaped, and commented examples cannot opt in a slide", () => {
    for (const source of [
        "```html\n<!-- _scroll: true -->\n```",
        "    <!-- _scroll: true -->",
        "&lt;!-- _scroll: true --&gt;",
        "<!-- Example:\n<!-- _scroll: true -->\n-->",
        "<!-- _scroll: false -->",
        "<!-- _scroll: invalid -->",
    ]) {
        assert.doesNotMatch(
            sectionsOf(`# Example\n\n${source}`)[0],
            /marpagent-scroll/,
        );
    }
});

test("hidden slides preserve inherited scroll and visible pagination", () => {
    const sections = sectionsOf(`---
paginate: true
---
<!-- _scroll: true -->
# One

Body

---
<!-- hide: true -->
<!-- scroll: true -->
# Hidden

---
# Three

Body

---
<!-- scroll: false -->
# Four
`);
    assert.equal(sections.length, 3);
    assert.deepEqual(
        sections.map(
            (section) => section.match(/<section[^>]* id="([^"]*)"/)[1],
        ),
        ["1", "3", "4"],
    );
    assert.deepEqual(
        sections.map(
            (section) => section.match(/data-marpit-pagination="([^"]*)"/)[1],
        ),
        ["1", "2", "3"],
    );
    assert.ok(
        sections.every((section) =>
            section.includes('data-marpit-pagination-total="3"'),
        ),
    );
    assert.deepEqual(
        sections.map((section) =>
            section.includes('data-marpagent-scroll="true"'),
        ),
        [true, true, false],
    );
});

test("fixed elements stay outside one body while nested Markdown and raw HTML stay together", () => {
    const section = sectionsOf(`---
header: Fixed header
footer: Fixed footer
paginate: true
---
<!-- _scroll: true -->
<script>window.example = true</script>

<div class="col">

## Nested heading

- Parent
  - Child

</div>

## First direct heading

### Body heading

<div class="note">

Body text

</div>
`)[0];
    const body = section.match(
        /<div class="marpagent-scroll-body"[^>]*>([\s\S]*?)<\/div>\s*<footer>/,
    )[1];
    assert.match(body, /<div class="col">\s*<h2[^>]*>Nested heading/);
    assert.match(body, /<li>Child<\/li>/);
    assert.match(body, /<h3[^>]*>Body heading/);
    assert.match(body, /<div class="note">/);
    assert.doesNotMatch(
        body,
        /First direct heading|Fixed header|Fixed footer|<script|<style/,
    );
    assert.match(
        section,
        /<header>Fixed header<\/header>\s*<h2[^>]*>First direct heading<\/h2>\s*<div class="marpagent-scroll-body"/,
    );
    assert.match(
        section,
        /<\/footer>\s*<script>window.example = true<\/script>/,
    );
});

test("an HTML heading is fixed without moving its following sibling", () => {
    const section = sectionsOf(
        "<!-- _scroll: true -->\n\n<h2>Fixed</h2><p>Body</p>",
    )[0];
    assert.match(
        section,
        /<h2>Fixed<\/h2>\s*<div class="marpagent-scroll-body"[^>]*><p>Body<\/p>/,
    );
});

test("raw-text script strings cannot absorb the fixed heading or body", () => {
    const section = sectionsOf(`<!-- _scroll: true -->

<script>const example = "<!-- <div>";</script>

<h2>Fixed</h2><p>Body</p>
`)[0];
    assert.match(
        section,
        /<h2>Fixed<\/h2>\s*<div class="marpagent-scroll-body"[^>]*><p>Body<\/p>/,
    );
    assert.match(
        section,
        /<\/div>\s*<script>const example = "<!-- <div>";<\/script>/,
    );
});

test("scoped CSS, math, Mermaid, and Core helper scripts survive body wrapping", () => {
    const marp = createConfiguredMarp();
    const { html, css } = marp.render(`---
math: mathjax
---
<!-- _scroll: true -->
## Fixed

<style scoped>p { color: red; }</style>

Formula $x^2$.

\`\`\`mermaid
flowchart LR
A[Input] --> B[Output]
\`\`\`

\`\`\`mermaid interactive
flowchart LR
A[Input] --> B[Output]
\`\`\`
`);
    assert.match(html, /data-marpit-scope-/);
    assert.match(css, /section\[data-marpit-scope-[^\]]+\] p/);
    const section = html.match(/<section\b[^>]*>[\s\S]*?<\/section>/)[0];
    const body = section.slice(
        section.indexOf('<div class="marpagent-scroll-body"'),
    );
    assert.match(body, /<mjx-container/);
    assert.match(body, /class="mermaid-diagram"/);
    assert.match(html, /<\/section>\s*<script/);
    // SVG-local styles remain part of the diagram; browser helpers do not.
    assert.doesNotMatch(body, /<script/);
});
