const fs = require("node:fs");
const path = require("node:path");
const { ensureCustomSizesForMarkdown } = require("./src/canvas-size");
const { loadDefaultJapaneseParser } = require("budoux");
const marpGithubAlertsPlugin = require("./scripts/github-alerts-plugin");
const marpHideSlidesPlugin = require("./scripts/hide-slides-plugin");
const marpMermaidPlugin = require("./scripts/mermaid-plugin");

const cursorScript = fs.readFileSync(
    path.join(__dirname, "scripts/presenter-cursor.js"),
    "utf8",
);

// BudouX inserts ZWSP (U+200B) at Japanese phrase boundaries and adds
// word-break:keep-all;overflow-wrap:anywhere as inline styles.
// We strip overflow-wrap:anywhere so that keep-all alone governs breaks:
// long katakana compounds overflow rather than splitting mid-word,
// and the browser prefers spaces/ZWSP as break points (e.g. before は).
// SVG <text>/<tspan> ZWSP is also stripped to protect Mermaid metrics.
const budouxJa = loadDefaultJapaneseParser();
const ZWSP = "​";
const SVG_TEXT_ZWSP_RE =
    /(<(?:text|tspan)\b[^>]*>)([\s\S]*?)(<\/(?:text|tspan)>)/g;
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
    "source",
    "track",
    "wbr",
]);
const SELF_CLOSING_TAG_RE = /<([a-z][a-z0-9]*)\b([^>]*?)\s*\/>/gi;

function expandSelfClosingNonVoidTags(html) {
    return html.replace(SELF_CLOSING_TAG_RE, (match, tagName, attrs) => {
        const tag = tagName.toLowerCase();
        return VOID_TAGS.has(tag) ? match : `<${tagName}${attrs}></${tagName}>`;
    });
}

function applyBudoux(html) {
    const translated = budouxJa.translateHTMLString(html);
    const cleaned = translated
        .replace(/overflow-wrap:anywhere;?/g, "")
        .replace(
            SVG_TEXT_ZWSP_RE,
            (_, open, inner, close) =>
                open + inner.replaceAll(ZWSP, "") + close,
        );
    return expandSelfClosingNonVoidTags(cleaned);
}

// Collect only the compiled theme CSS files at themes/*.css (not subdirectories).
const themeSet = fs
    .readdirSync(path.join(__dirname, "themes"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => `./themes/${f}`);

module.exports = {
    allowLocalFiles: true,
    themeSet,
    html: true,
    engine: ({ marp }) => {
        const base = marp
            .use(marpHideSlidesPlugin)
            .use(marpMermaidPlugin)
            .use(marpGithubAlertsPlugin);
        const _render = base.render.bind(base);
        base.render = (markdown, env) => {
            ensureCustomSizesForMarkdown(base, markdown);
            const result = _render(markdown, env);
            const html =
                applyBudoux(result.html) + `\n<script>${cursorScript}</script>`;
            return { ...result, html };
        };
        return base;
    },
};
