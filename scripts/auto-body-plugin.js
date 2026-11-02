const { parseDocument } = require("htmlparser2");
const { bodyGroups, groupTag } = require("./scroll-slides-plugin");

function groupClasses(group) {
    const first = group[0];
    if (first.type !== "html_block")
        return (first.attrGet("class") || "").split(/\s+/);
    const node = parseDocument(first.content).children.find(
        (n) => n.type === "tag",
    );
    return (node?.attribs?.class || "").split(/\s+/);
}

function wrap(open, tokens, Token) {
    const groups = bodyGroups(tokens, Token);
    if (groups.some((g) => groupClasses(g).includes("paper-header")))
        return tokens;
    open.attrSet("data-marpagent-auto-body", "true");
    const logo = [];
    if (!groups.some((g) => groupTag(g) === "header")) {
        const mark = new Token("html_block", "", 0);
        mark.content = '<div class="slide-logos" aria-hidden="true"></div>\n';
        logo.push(mark);
    }
    if (groups.some((g) => groupClasses(g).includes("body")))
        return [...tokens, ...logo];
    const before = [],
        body = [],
        after = [];
    let contentSeen = false;
    for (const group of groups) {
        const tag = groupTag(group);
        const first = group[0];
        if (tag === "header") before.push(...group);
        else if (
            ["footer", "script", "style"].includes(tag) ||
            first.type === "marpit_style"
        )
            after.push(...group);
        else if (
            first.hidden ||
            (first.type === "html_block" &&
                /^\s*<!--[\s\S]*-->\s*$/.test(first.content))
        )
            before.push(...group);
        else if (!contentSeen && /^h[1-6]$/.test(tag || "")) {
            before.push(...group);
            contentSeen = true;
        } else {
            body.push(...group);
            contentSeen = true;
        }
    }
    const start = new Token("marpagent_body_open", "div", 1);
    start.block = true;
    start.attrSet("class", "body box");
    const end = new Token("marpagent_body_close", "div", -1);
    end.block = true;
    return [...before, start, ...body, end, ...after, ...logo];
}

module.exports = (md) => {
    md.marpit.customDirectives.local.autoBody = (value) => ({
        autoBody: value === true || value === "true",
    });
    md.core.ruler.before(
        "marpagent_scroll_slides",
        "marpagent_auto_body",
        (state) => {
            if (state.inlineMode) return;
            const output = [];
            for (let i = 0; i < state.tokens.length; i++) {
                const open = state.tokens[i];
                output.push(open);
                const directives = open.meta?.marpitDirectives;
                if (
                    open.type !== "marpit_slide_open" ||
                    directives?.autoBody === false ||
                    directives?.scroll ||
                    (open.attrGet("class") || "").split(/\s+/).includes("title")
                )
                    continue;
                let end = i + 1;
                while (
                    end < state.tokens.length &&
                    state.tokens[end].type !== "marpit_slide_close"
                )
                    end++;
                output.push(
                    ...wrap(open, state.tokens.slice(i + 1, end), state.Token),
                );
                i = end - 1;
            }
            state.tokens = output;
        },
    );
};
