const { HTML_TAG_RE } = require("markdown-it/lib/common/html_re.mjs");

const VOID_TAGS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);
const HTML_TAGS = new RegExp(HTML_TAG_RE.source.slice(1), "g");
const RAW_TEXT_TAGS = new Set(["script", "style", "textarea"]);

// Track only raw HTML tokens, not rendered HTML. Markdown nesting remains
// governed by tokens; raw component containers can span several such tokens.
function htmlParts(token, stack, Token) {
    const parts = [];
    const content = token.content;
    let start = 0;
    HTML_TAGS.lastIndex = 0;
    let match;
    while (HTML_TAGS.lastIndex < content.length) {
        const raw = stack.at(-1);
        if (RAW_TEXT_TAGS.has(raw)) {
            // Raw-text elements do not parse comments or tag-like JS/CSS strings.
            // Consume just their closing tag before returning to normal HTML.
            match = new RegExp(`</${raw}\\s*>`, "i").exec(
                content.slice(HTML_TAGS.lastIndex),
            );
            if (!match) break;
            HTML_TAGS.lastIndex += match.index + match[0].length;
        } else {
            match = HTML_TAGS.exec(content);
            if (!match) break;
        }
        const tag = /^<(\/?)([a-z][\w-]*)/i.exec(match[0]);
        if (tag) {
            const name = tag[2].toLowerCase();
            if (tag[1]) {
                const index = stack.lastIndexOf(name);
                if (index >= 0) stack.length = index;
            } else if (!VOID_TAGS.has(name) && !/\/>$/.test(match[0])) {
                stack.push(name);
            }
        }
        if (stack.length === 0) {
            const part = new Token(token.type, token.tag, token.nesting);
            Object.assign(part, token, {
                content: content.slice(start, HTML_TAGS.lastIndex),
            });
            parts.push({ token: part, complete: true });
            start = HTML_TAGS.lastIndex;
        }
    }
    if (start < content.length) {
        const remainder = content.slice(start);
        if (!remainder.trim() && parts.length) {
            parts.at(-1).token.content += remainder;
        } else {
            const part = new Token(token.type, token.tag, token.nesting);
            Object.assign(part, token, { content: remainder });
            parts.push({ token: part, complete: stack.length === 0 });
        }
    }
    return parts;
}

function bodyGroups(tokens, Token) {
    const groups = [];
    const htmlStack = [];
    let depth = 0;
    let group = [];
    for (const token of tokens) {
        if (token.type === "html_block" && depth === 0) {
            for (const part of htmlParts(token, htmlStack, Token)) {
                group.push(part.token);
                if (part.complete) {
                    groups.push(group);
                    group = [];
                }
            }
        } else {
            group.push(token);
            depth += token.nesting;
            if (depth === 0 && htmlStack.length === 0) {
                groups.push(group);
                group = [];
            }
        }
    }
    if (group.length) groups.push(group);
    return groups;
}

function groupTag(group) {
    const token = group[0];
    if (token.type === "html_block") {
        return /^<([a-z][\w-]*)\b/i
            .exec(token.content.trim())?.[1]
            .toLowerCase();
    }
    return token.tag;
}

function wrapSlide(open, tokens, Token) {
    open.attrSet("data-marpagent-scroll", "true");
    const fixed = [];
    const body = [];
    const end = [];
    const helpers = [];
    let headingFound = false;
    for (const group of bodyGroups(tokens, Token)) {
        const tag = groupTag(group);
        if (tag === "footer") {
            end.push(...group);
        } else if (
            ["script", "style"].includes(tag) ||
            group[0].type === "marpit_style"
        ) {
            helpers.push(...group);
        } else if (tag === "header") {
            fixed.push(...group);
        } else if (!headingFound && /^h[1-6]$/.test(tag || "")) {
            headingFound = true;
            fixed.push(...group);
        } else {
            body.push(...group);
        }
    }
    const bodyOpen = new Token("marpagent_scroll_body_open", "div", 1);
    bodyOpen.block = true;
    bodyOpen.attrs = [
        ["class", "marpagent-scroll-body"],
        ["tabindex", "0"],
        ["role", "region"],
        ["aria-label", "Slide content"],
    ];
    const bodyClose = new Token("marpagent_scroll_body_close", "div", -1);
    bodyClose.block = true;
    return [...fixed, bodyOpen, ...body, bodyClose, ...end, ...helpers];
}

module.exports = (md) => {
    md.marpit.customDirectives.local.scroll = (value) => ({
        scroll: value === true || value === "true",
    });
    // Run after marginal elements and hidden-slide removal, but before Core
    // attaches its browser helpers to the section's closing token.
    md.core.ruler.before(
        "marp_core_script",
        "marpagent_scroll_slides",
        (state) => {
            if (state.inlineMode) return;
            const output = [];
            for (let i = 0; i < state.tokens.length; i += 1) {
                const open = state.tokens[i];
                output.push(open);
                if (
                    open.type !== "marpit_slide_open" ||
                    !open.meta?.marpitDirectives?.scroll
                )
                    continue;
                let end = i + 1;
                while (
                    end < state.tokens.length &&
                    state.tokens[end].type !== "marpit_slide_close"
                )
                    end += 1;
                output.push(
                    ...wrapSlide(
                        open,
                        state.tokens.slice(i + 1, end),
                        state.Token,
                    ),
                );
                i = end - 1;
            }
            state.tokens = output;
        },
    );
};
