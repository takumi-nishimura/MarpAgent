// Resolve membership before hiding slides. Build the list from the surviving
// slides after Marpit has parsed their inherited and spot headers.
const { parseDocument, DomUtils } = require("htmlparser2");

const { groupClasses } = require("./auto-body-plugin");
const { bodyGroups } = require("./scroll-slides-plugin");

function headerLabel(inline, md, env) {
    const tokens = inline.children || [];
    const render = part => md.renderer.renderInline(part, md.options, env);
    const text = part => DomUtils.innerText(parseDocument(render(part)).children)
        .replace(/\s+/g, " ");

    // MathJax's SVG has no text and KaTeX includes multiple representations.
    // Keep math tokens intact while reducing the rest of the header to text.
    const parts = [];
    let start = 0;
    for (const [index, token] of tokens.entries()) {
        if (token.type !== "marp_math_inline") continue;
        parts.push(text(tokens.slice(start, index)), token);
        start = index + 1;
    }
    parts.push(text(tokens.slice(start)));
    parts[0] = parts[0].trimStart();
    parts[parts.length - 1] = parts.at(-1).trimEnd();
    if (!parts.some(Boolean)) return;

    return {
        key: JSON.stringify(parts.map(part => typeof part === "string" ? part : [part.content])),
        html: parts.map(part => typeof part === "string" ? md.utils.escapeHtml(part) : render([part])).join(""),
    };
}

function insertContents(tokens, list, Token) {
    const groups = bodyGroups(tokens, Token);
    const body = groups.find(group => groupClasses(group).includes("body"));
    if (!body) return [...tokens, list];

    // A standalone directive inside a body selects the exact cell or position.
    const marker = body.findIndex(token =>
        token.type === "marpit_comment" && token.meta?.marpitParsedDirectives?._toc === "true",
    );
    if (marker >= 0) {
        body.splice(marker + 1, 0, list);
    } else {
        // bodyGroups isolates this top-level HTML element, including when
        // several elements share one html_block token.
        const last = body.at(-1);
        const closing = last.type === "html_block" && /<\/[\w:-]+\s*>\s*$/.exec(last.content);
        if (closing) {
            last.content = last.content.slice(0, closing.index) + list.content + closing[0];
        } else {
            body.push(list);
        }
    }
    return groups.flat();
}

module.exports = (md) => {
    md.marpit.customDirectives.local.section = (value) => ({
        contentsSection: String(value ?? "").trim(),
    });
    md.marpit.customDirectives.local.toc = (value) => ({
        contentsPage: value === true || value === "true",
    });

    md.core.ruler.before("marpit_directives_apply", "marpagent_sections", (state) => {
        if (state.inlineMode) return;
        state.hasContentsSections = false;
        for (const token of state.tokens) {
            if (token.type !== "marpit_slide_open") continue;
            const { contentsSection, header, contentsPage } = token.meta.marpitDirectives;
            if (!contentsSection) continue;
            state.hasContentsSections = true;
            if (header === undefined && !contentsPage) {
                // Marpit parses the generated header as inline Markdown. Escape
                // punctuation so a chapter label is displayed as literal text.
                token.meta.marpitHeader = contentsSection.replace(/[!-/:-@[-`{-~]/g, "\\$&");
            }
        }
    });

    md.core.ruler.before("marpagent_auto_body", "marpagent_contents", (state) => {
        if (state.inlineMode) return;
        const slides = state.tokens.filter(token => token.type === "marpit_slide_open");
        if (!slides.some(token => token.meta.marpitDirectives.contentsPage)) return;

        const labels = [];
        const insertions = [];
        let previous = "";
        let current;
        let start;
        let header;
        for (const [index, token] of state.tokens.entries()) {
            if (token.type === "marpit_slide_open") {
                current = token;
                start = index + 1;
                header = undefined;
            } else if (token.type === "marpit_header_open" && !state.hasContentsSections) {
                header = headerLabel(state.tokens[index + 1], md, state.env);
            } else if (token.type === "marpit_slide_close") {
                const { contentsPage, contentsSection } = current.meta.marpitDirectives;
                if (contentsPage) {
                    insertions.push([start, index]);
                    continue;
                }
                if (!state.hasContentsSections && (current.attrGet("class") || "").split(/\s+/).includes("title")) continue;
                const key = state.hasContentsSections ? contentsSection : header?.key;
                if (key && key !== previous) {
                    labels.push(state.hasContentsSections ? md.utils.escapeHtml(contentsSection) : header.html);
                }
                if (key || state.hasContentsSections) previous = key;
            }
        }
        if (!labels.length) return;
        const items = labels.map(label => `<li>${label}</li>`).join("");
        for (const [start, end] of insertions.reverse()) {
            const list = new state.Token("html_block", "", 0);
            list.content = `<ol class="section-contents">${items}</ol>\n`;
            const content = insertContents(state.tokens.slice(start, end), list, state.Token);
            state.tokens.splice(start, end - start, ...content);
        }
    });
};
