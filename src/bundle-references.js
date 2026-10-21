const { parseDocument } = require("htmlparser2");
const { decodeHTMLAttribute, escapeAttribute } = require("entities");
const parseCss = require("postcss-value-parser");

function applyEdits(source, edits) {
    const parts = [];
    let cursor = 0;
    for (const { start, end, value } of edits.sort(
        (a, b) => a.start - b.start,
    )) {
        parts.push(source.slice(cursor, start), value);
        cursor = end;
    }
    parts.push(source.slice(cursor));
    return parts.join("");
}

function decodeCss(value) {
    return value.replace(
        /\\(?:([\da-f]{1,6})(?:\r\n|[\t\n\f\r ])?|\r\n|[\n\r\f]|([^\da-f\n\r\f]))/gi,
        (_match, hex, escaped) => {
            if (!hex) return escaped || "";
            const code = parseInt(hex, 16);
            return code === 0 ||
                code > 0x10ffff ||
                (code >= 0xd800 && code <= 0xdfff)
                ? "\ufffd"
                : String.fromCodePoint(code);
        },
    );
}

function cssString(value) {
    return (
        '"' +
        value.replace(/["\\\n\r\f]/g, (character) =>
            character === "\n"
                ? "\\a "
                : character === "\r"
                  ? "\\d "
                  : character === "\f"
                    ? "\\c "
                    : "\\" + character,
        ) +
        '"'
    );
}

function rewriteCss(source, onReference, context, unsupported) {
    const edits = [];
    const resources = [];
    const root = parseCss(source);
    const nodes = root.nodes;
    root.walk((node) => {
        if (node.type !== "function" || node.value.toLowerCase() !== "url")
            return;
        if (node.unclosed) {
            unsupported.push({
                code: "MALFORMED_CSS",
                message: "An unclosed CSS URL cannot be rewritten safely.",
            });
            return false;
        }
        const value = decodeCss(
            parseCss
                .stringify(node.nodes)
                .trim()
                .replace(/^(["'])([\s\S]*)\1$/, "$2"),
        );
        resources.push({ node, value, kind: "css-url" });
        return false;
    });
    for (let i = 0; i < nodes.length; i++) {
        if (
            nodes[i].type !== "word" ||
            nodes[i].value.toLowerCase() !== "@import"
        )
            continue;
        let j = i + 1;
        while (["space", "comment"].includes(nodes[j]?.type)) j += 1;
        const node = nodes[j];
        if (node?.type !== "string") continue;
        const value = decodeCss(node.value);
        resources.push({ node, value, kind: "css-import" });
    }
    for (const { node, value, kind } of resources.sort(
        (a, b) => a.node.sourceIndex - b.node.sourceIndex,
    )) {
        const rewritten = onReference(value, { ...context, kind });
        if (rewritten !== value)
            edits.push({
                start: node.sourceIndex,
                end: node.sourceEndIndex,
                value:
                    kind === "css-url"
                        ? `url(${cssString(rewritten)})`
                        : cssString(rewritten),
            });
    }
    return applyEdits(source, edits);
}

function rewriteSrcset(source, onReference, context) {
    const edits = [];
    let position = 0;
    while (position < source.length) {
        while (/[\s,]/.test(source[position] || "") && position < source.length)
            position += 1;
        if (position >= source.length) break;
        const start = position;
        while (position < source.length && !/\s/.test(source[position]))
            position += 1;
        let end = position;
        while (end > start && source[end - 1] === ",") end -= 1;
        const value = source.slice(start, end);
        const rewritten = onReference(value, { ...context, kind: "srcset" });
        if (rewritten !== value) edits.push({ start, end, value: rewritten });
        if (end < position) continue;
        let parentheses = 0;
        while (position < source.length) {
            const character = source[position++];
            if (character === "(") parentheses += 1;
            else if (character === ")") parentheses -= 1;
            else if (character === "," && parentheses === 0) break;
        }
    }
    return applyEdits(source, edits);
}

function openingTagEnd(source, start) {
    let quote = null;
    for (let i = start; i < source.length; i++) {
        const character = source[i];
        if (quote) {
            if (character === quote) quote = null;
        } else if (character === '"' || character === "'") quote = character;
        else if (character === ">") return i;
    }
    return source.length - 1;
}

/** Rewrite static resource references without serializing markup or executing scripts. */
function rewriteReferences(
    source,
    { kind = "html", onReference = (value) => value } = {},
) {
    const unsupported = [];
    if (kind === "css")
        return {
            content: rewriteCss(
                source,
                onReference,
                { page: null },
                unsupported,
            ),
            unsupported,
        };
    const doc = parseDocument(source, {
        xmlMode: kind === "svg",
        withStartIndices: true,
        withEndIndices: true,
        recognizeSelfClosing: true,
    });
    const edits = [];
    let pageNumber = 0;
    function visit(node, inheritedPage) {
        if (!node.name) {
            for (const child of node.children || [])
                visit(child, inheritedPage);
            return;
        }
        const tag = node.name.toLowerCase();
        const page =
            tag === "section" && kind === "html" && inheritedPage === null
                ? ++pageNumber
                : inheritedPage;
        const openEnd = openingTagEnd(source, node.startIndex);
        const open = source.slice(node.startIndex, openEnd + 1);
        const context = { tag, page };
        const attributePattern =
            /\s+([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        for (const match of open.matchAll(attributePattern)) {
            if (
                match[2] === undefined &&
                match[3] === undefined &&
                match[4] === undefined
            )
                continue;
            const name = match[1].toLowerCase();
            const raw = match[2] ?? match[3] ?? match[4];
            const value =
                kind === "svg"
                    ? require("entities").decodeXML(raw)
                    : decodeHTMLAttribute(raw);
            let rewritten = value;
            const attributeContext = { ...context, attribute: name };
            if (
                name === "style" ||
                [
                    "fill",
                    "stroke",
                    "filter",
                    "clip-path",
                    "mask",
                    "marker-start",
                    "marker-mid",
                    "marker-end",
                    "cursor",
                ].includes(name)
            )
                rewritten = rewriteCss(
                    value,
                    onReference,
                    attributeContext,
                    unsupported,
                );
            else if (name === "srcset" && ["img", "source"].includes(tag))
                rewritten = rewriteSrcset(value, onReference, attributeContext);
            else if (
                (name === "src" &&
                    [
                        "img",
                        "video",
                        "audio",
                        "source",
                        "track",
                        "embed",
                        "script",
                        "input",
                    ].includes(tag)) ||
                (name === "poster" && tag === "video") ||
                (name === "data" && tag === "object") ||
                (["href", "xlink:href"].includes(name) &&
                    ["image", "use", "feimage", "script"].includes(tag)) ||
                (name === "href" &&
                    tag === "link" &&
                    /\b(?:stylesheet|icon|preload|modulepreload)\b/i.test(
                        node.attribs?.rel || "",
                    ))
            )
                rewritten = onReference(value, {
                    ...attributeContext,
                    kind: "attribute",
                });
            if (rewritten === value) continue;
            const equals = match[0].indexOf("=");
            const afterEquals = match[0].slice(equals + 1);
            const leadingWhitespace =
                afterEquals.length - afterEquals.trimStart().length;
            const quote =
                match[2] !== undefined
                    ? '"'
                    : match[3] !== undefined
                      ? "'"
                      : "";
            const start =
                node.startIndex + match.index + equals + 1 + leadingWhitespace;
            edits.push({
                start,
                end: start + raw.length + quote.length * 2,
                value: '"' + escapeAttribute(rewritten) + '"',
            });
        }
        if (tag === "script") return;
        if (tag === "style") {
            const start = openEnd + 1;
            const closeStart = source.lastIndexOf("</", node.endIndex);
            if (closeStart >= start) {
                const css = source.slice(start, closeStart);
                const rewritten = rewriteCss(
                    css,
                    onReference,
                    context,
                    unsupported,
                );
                if (css !== rewritten)
                    edits.push({ start, end: closeStart, value: rewritten });
            }
            return;
        }
        for (const child of node.children || []) visit(child, page);
    }
    visit(doc, null);
    return { content: applyEdits(source, edits), unsupported };
}

module.exports = { rewriteReferences };
