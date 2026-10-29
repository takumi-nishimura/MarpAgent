const { renderD2Sync, PRELUDE } = require("../src/d2-render");
const { escapeHtml } = require("../src/d2-diagnostics");

const D2_CSS = `
section .d2-diagram { display:flex; width:100%; min-width:0; justify-content:center; align-items:flex-start; margin:0.5em 0; overflow:visible; }
section .d2-diagram > svg { flex:0 1 auto; width:var(--d2-width, 100%); max-width:100%; height:auto; max-height:var(--d2-max-height, 500px); }
section:has(> .paper-header) .d2-diagram > svg { max-height:var(--d2-max-height, none); }
section .d2-render-error { white-space:normal; overflow-wrap:anywhere; }
`;

function marpD2Plugin(md) {
    const fence = md.renderer.rules.fence;
    md.marpagentD2Diagnostics = [];
    md.core.ruler.push("marpagent_d2_locations", (state) => {
        // This rule only annotates tokens. Compilation belongs to the renderer,
        // after hidden slides have been removed, never to parse-only slide maps.
        md.marpagentD2Diagnostics = [];
        let slide = 1;
        let ordinal = 0;
        for (const token of state.tokens) {
            if (token.type === "marpit_slide_open")
                slide = (token.meta?.marpitSlide ?? 0) + 1;
            if (
                token.type === "fence" &&
                /^d2(?:\s|$)/.test(token.info.trim())
            ) {
                token.meta = {
                    ...token.meta,
                    d2: {
                        slide,
                        ordinal: ordinal++,
                        line: (token.map?.[0] ?? 0) + 1,
                    },
                };
            }
        }
    });
    md.renderer.rules.fence = (tokens, index, options, env, self) => {
        const token = tokens[index];
        if (!/^d2(?:\s|$)/.test(token.info.trim()))
            return fence(tokens, index, options, env, self);
        const location = token.meta?.d2 || {
            line: (token.map?.[0] ?? 0) + 1,
            slide: 1,
            ordinal: index,
        };
        try {
            if (token.info.trim() !== "d2") {
                const error = new Error(
                    "Unsupported D2 fence arguments; put settings in vars.d2-config.",
                );
                error.code = "D2_FENCE_ARGUMENTS";
                throw error;
            }
            const svg = renderD2Sync(token.content, {
                salt: `line-${location.line}-block-${location.ordinal}`,
                cwd:
                    env?.marpagentD2Cwd ||
                    process.env.MARP_AGENT_D2_CWD ||
                    process.cwd(),
            });
            return `<div class="d2-diagram" data-marpagent-d2="true">${svg}</div>\n`;
        } catch (error) {
            const preludeLines = PRELUDE.split("\n").length - 1;
            const sourceLocation = /(?:^|\s)-:(\d+):(\d+):/.exec(
                error.stderr || error.message || "",
            );
            const line = sourceLocation
                ? location.line +
                  Math.max(1, Number(sourceLocation[1]) - preludeLines)
                : location.line;
            const message = String(error.message || "D2 failed to render.")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 600);
            const diagnostic = {
                engine: "d2",
                code: error.code || "D2_RENDER_FAILED",
                message,
                line,
                slide: location.slide,
            };
            md.marpagentD2Diagnostics.push(diagnostic);
            const attributes = `data-marpagent-render-error="d2" data-marpagent-render-code="${escapeHtml(diagnostic.code)}" data-marpagent-render-message="${escapeHtml(message)}" data-marpagent-source-line="${line}" data-marpagent-source-slide="${location.slide}"`;
            return `<div class="d2-render-error" ${attributes}><strong>D2 · slide ${location.slide}, line ${line}</strong>: ${escapeHtml(message)}</div>\n${fence(tokens, index, options, env, self)}`;
        }
    };
}

module.exports = marpD2Plugin;
module.exports.D2_CSS = D2_CSS;
