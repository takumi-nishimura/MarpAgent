const fs = require("node:fs");
const path = require("node:path");
const { Marp } = require("@marp-team/marp-core/full");
const { ensureCustomSizesForMarkdown } = require("./src/canvas-size");
const { normalizeMarkdown } = require("./src/markdown-input");
const { loadDefaultJapaneseParser } = require("budoux");
const marpGithubAlertsPlugin = require("./scripts/github-alerts-plugin");
const marpHideSlidesPlugin = require("./scripts/hide-slides-plugin");
const marpMermaidPlugin = require("./scripts/mermaid-plugin");
const marpD2Plugin = require("./scripts/d2-plugin");
const { assertD2RenderSucceeded } = require("./src/d2-diagnostics");
const marpScrollSlidesPlugin = require("./scripts/scroll-slides-plugin");

const cursorScript = fs.readFileSync(
    path.join(__dirname, "scripts/presenter-cursor.js"),
    "utf8",
);
const scrollScript = fs.readFileSync(
    path.join(__dirname, "scripts/presenter-scroll.js"),
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
const SELF_CLOSING_TAG_RE =
    /<([a-z][a-z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*?)\s*\/>/gi;

function expandSelfClosingNonVoidTags(html) {
    return html.replace(SELF_CLOSING_TAG_RE, (match, tagName, attrs) => {
        const tag = tagName.toLowerCase();
        return VOID_TAGS.has(tag) ? match : `<${tagName}${attrs}></${tagName}>`;
    });
}

function applyBudoux(html) {
    // Core 5 embeds browser helpers inside the SVG foreignObject. BudouX's
    // parser otherwise escapes JS/CSS as XML text, breaking these helpers.
    let prefix = "marpagent-raw";
    while (html.includes(prefix)) prefix += "_";
    const rawElements = [];
    const protectedDiagrams = html.replace(
        /<div class="d2-diagram" data-marpagent-d2="true">[\s\S]*?<\/div>/g,
        (element) => {
            rawElements.push(element);
            return `<!--${prefix}-${rawElements.length - 1}-->`;
        },
    );
    const protectedHtml = protectedDiagrams.replace(
        /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
        (element) => {
            rawElements.push(element);
            return `<!--${prefix}-${rawElements.length - 1}-->`;
        },
    );
    const translated = budouxJa.translateHTMLString(protectedHtml);
    const cleaned = translated
        .replace(/overflow-wrap:anywhere;?/g, "")
        .replace(
            SVG_TEXT_ZWSP_RE,
            (_, open, inner, close) =>
                open + inner.replaceAll(ZWSP, "") + close,
        );
    return expandSelfClosingNonVoidTags(cleaned).replace(
        new RegExp(`<!--${prefix}-(\\d+)-->`, "g"),
        (_, index) => rawElements[Number(index)],
    );
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
    // Always use the installed full Core 5 engine, including when CLI's
    // default engine resolves its bundled Core 4 from another working dir.
    engine: ({ marp: _defaultEngine, ...options }) => {
        const base = new Marp({ html: true, ...options })
            .use(marpHideSlidesPlugin)
            .use(marpMermaidPlugin)
            .use(marpD2Plugin)
            .use(marpGithubAlertsPlugin)
            .use(marpScrollSlidesPlugin);
        // Normalize both rendering and direct markdown.parse calls (slide maps).
        base.markdown.core.ruler.before(
            "normalize",
            "marpagent_bom",
            (state) => {
                state.src = normalizeMarkdown(state.src);
            },
        );
        const _render = base.render.bind(base);
        base.render = (markdown, env) => {
            ensureCustomSizesForMarkdown(base, markdown);
            const result = _render(markdown, env);
            if (process.env.MARP_AGENT_D2_STRICT === "1") {
                assertD2RenderSucceeded(result.html);
            }
            const html =
                applyBudoux(result.html) +
                `\n<script>${cursorScript}</script>\n<script>${scrollScript}</script>`;
            return {
                ...result,
                html,
                css: result.css + marpD2Plugin.D2_CSS,
                d2Diagnostics: [...base.markdown.marpagentD2Diagnostics],
            };
        };
        return base;
    },
};
