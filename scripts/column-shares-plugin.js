const { parseDocument } = require("htmlparser2");
const { encodeXML } = require("entities");
const postcss = require("postcss");

// Resolve shares once during rendering so HTML and static exports agree.
module.exports = (md) => {
    const render = md.renderer.render.bind(md.renderer);
    md.renderer.render = (...args) => {
        const html = render(...args);
        const document = parseDocument(html, { withStartIndices: true });
        const edits = [];
        function walk(node) {
            const classes = (node.attribs?.class || "").split(/\s+/);
            if (classes.includes("col") && classes.includes("shares")) {
                const children = (node.children || []).filter(
                    (child) => child.type === "tag",
                );
                if (!children.length)
                    throw new Error("Column share layout requires columns.");
                const shares = children.map((child) => {
                    let value = null;
                    postcss
                        .parse(`x {${child.attribs.style || ""}}`)
                        .walkDecls("--col-share", (decl) => {
                            if (
                                !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(
                                    decl.value.trim(),
                                )
                            )
                                throw new Error(
                                    "Column share must be a number between 0 and 1.",
                                );
                            value = Number(decl.value);
                            if (!(value > 0 && value <= 1))
                                throw new Error(
                                    "Column share must be greater than 0 and at most 1.",
                                );
                        });
                    return value;
                });
                const total = shares.reduce(
                    (sum, value) => sum + (value ?? 0),
                    0,
                );
                const missing = shares.filter((value) => value === null).length;
                if (
                    total > 1 + 1e-9 ||
                    (missing && total >= 1) ||
                    (!missing && Math.abs(total - 1) > 1e-9)
                )
                    throw new Error(
                        "Column shares must total 1, or leave positive space for unspecified columns.",
                    );
                const tracks = shares
                    .map(
                        (value) =>
                            `minmax(0, ${value ?? (1 - total) / missing}fr)`,
                    )
                    .join(" ");
                const attrs = {
                    ...node.attribs,
                    style: `${node.attribs.style || ""};display:grid;grid-template-columns:${tracks}`,
                };
                const opening = html
                    .slice(node.startIndex)
                    .match(/^<[^\s>]+(?:\s+(?:"[^"]*"|'[^']*'|[^'">])*)?>/)[0];
                edits.push({
                    start: node.startIndex,
                    length: opening.length,
                    text: `<${node.name} ${Object.entries(attrs)
                        .map(([name, value]) => `${name}="${encodeXML(value)}"`)
                        .join(" ")}>`,
                });
            }
            (node.children || []).forEach(walk);
        }
        walk(document);
        return edits
            .sort((a, b) => b.start - a.start)
            .reduce(
                (result, edit) =>
                    result.slice(0, edit.start) +
                    edit.text +
                    result.slice(edit.start + edit.length),
                html,
            );
    };
};
