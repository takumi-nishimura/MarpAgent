// Collect visible section headings before the automatic body layout runs.
// Generate plain label text so heading markup, notes and links are not cloned.
function headingText(children) {
    return children
        .map((token) => {
            if (token.children) return headingText(token.children);
            if (token.type === "softbreak" || token.type === "hardbreak")
                return " ";
            if (
                token.hidden ||
                token.type === "html_inline" ||
                token.type === "marpit_comment"
            )
                return "";
            return token.content;
        })
        .join("");
}

module.exports = (md) => {
    for (const key of ["toc", "section"]) {
        md.marpit.customDirectives.local[key] = (value) => ({
            [key]: value === true || value === "true",
        });
    }

    md.core.ruler.before(
        "marpagent_auto_body",
        "marpagent_contents",
        (state) => {
            if (state.inlineMode) return;
            const labels = [];
            const insertions = [];
            let section = false;
            let toc = false;
            for (const [i, token] of state.tokens.entries()) {
                if (token.type === "marpit_slide_open") {
                    const directives = token.meta.marpitDirectives;
                    toc = directives.toc;
                    section = directives.section && !toc;
                } else if (section && token.type === "heading_open") {
                    const inline = state.tokens[i + 1];
                    const label = headingText(inline.children || []).trim();
                    if (label) {
                        labels.push(md.utils.escapeHtml(label));
                        section = false;
                    }
                } else if (token.type === "marpit_slide_close") {
                    if (toc) insertions.push(i);
                    section = false;
                    toc = false;
                }
            }

            if (!labels.length) return;
            for (const i of insertions.reverse()) {
                const list = new state.Token("html_block", "", 0);
                list.content =
                    '<ol class="section-contents">' +
                    labels.map((label) => `<li>${label}</li>`).join("") +
                    "</ol>\n";
                state.tokens.splice(i, 0, list);
            }
        },
    );
};
