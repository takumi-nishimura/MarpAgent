const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDocument } = require("htmlparser2");
const { findAll, textContent } = require("domutils");
const { createConfiguredMarp } = require("../../src/slide-map");

const agenda = "<!-- _toc: true -->\n\n## Agenda";
const section = (heading) => "<!-- _section: true -->\n\n## " + heading;

test("agendas follow visible section headings across successive renders", () => {
    const engine = createConfiguredMarp();
    function agendas(pages) {
        const { html } = engine.render(pages.join("\n\n---\n\n"));
        const doc = parseDocument(html);
        const lists = findAll(
            (n) => n.attribs?.class === "section-contents",
            doc.children,
        );
        return lists.map((list) =>
            findAll((n) => n.name === "li", list.children).map(textContent),
        );
    }
    const question = section("**Question** & `<measure>`\n\n### Detail");
    const method = section("[Method](https://example.com)");
    const hidden = "<!-- _hide: true -->\n" + section("Omit");
    const ordinary =
        "## Supporting slide\n\n```md\n<!-- _section: true -->\n```";
    const labels = ["Question & <measure>", "Method"];
    assert.deepEqual(
        agendas([agenda, question, hidden, ordinary, method, agenda]),
        [labels, labels],
    );
    assert.deepEqual(agendas([agenda, method, section("Revised question")]), [
        ["Method", "Revised question"],
    ]);
    assert.deepEqual(agendas([agenda, method]), [["Method"]]);
    assert.deepEqual(agendas([agenda, ordinary]), []);
    assert.deepEqual(agendas([question]), []);
});
