// Resolve membership before hiding slides. Build the list from the surviving
// slides after Marpit has parsed their inherited and spot headers.
const { parseDocument, DomUtils } = require("htmlparser2");

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
        let header = "";
        for (const [index, token] of state.tokens.entries()) {
            if (token.type === "marpit_slide_open") {
                current = token;
                header = "";
            } else if (token.type === "marpit_header_open" && !state.hasContentsSections) {
                const inline = state.tokens[index + 1];
                const html = md.renderer.renderInline(inline.children || [], md.options, state.env);
                header = DomUtils.innerText(parseDocument(html).children).replace(/\s+/g, " ").trim();
            } else if (token.type === "marpit_slide_close") {
                const { contentsPage, contentsSection } = current.meta.marpitDirectives;
                if (contentsPage) {
                    insertions.push(index);
                    continue;
                }
                if (!state.hasContentsSections && (current.attrGet("class") || "").split(/\s+/).includes("title")) continue;
                const label = state.hasContentsSections ? contentsSection : header;
                if (label && label !== previous) labels.push(label);
                if (label || state.hasContentsSections) previous = label;
            }
        }
        if (!labels.length) return;
        const items = labels.map(label => `<li>${md.utils.escapeHtml(label)}</li>`).join("");
        for (const index of insertions.reverse()) {
            const list = new state.Token("html_block", "", 0);
            list.content = `<ol class="section-contents">${items}</ol>\n`;
            state.tokens.splice(index, 0, list);
        }
    });
};
