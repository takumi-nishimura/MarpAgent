const { decodeHTML } = require("entities");

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        (char) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[char],
    );
}

// These attributes are emitted by the D2 plugin, so exporters can inspect the
// HTML they already compiled without starting another compiler or a browser.
function collectD2RenderDiagnostics(html) {
    const diagnostics = [];
    const tags = /<(?:pre|div)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
    for (const tag of String(html).matchAll(tags)) {
        const attributes = {};
        for (const attr of tag[1].matchAll(
            /\b(data-marpagent-[\w-]+)\s*=\s*(["'])(.*?)\2/gs,
        )) {
            attributes[attr[1]] = decodeHTML(attr[3]);
        }
        if (attributes["data-marpagent-render-error"] !== "d2") continue;
        diagnostics.push({
            engine: "d2",
            code:
                attributes["data-marpagent-render-code"] || "D2_RENDER_FAILED",
            message:
                attributes["data-marpagent-render-message"] ||
                "D2 failed to render.",
            line: Number(attributes["data-marpagent-source-line"]) || 1,
            slide: Number(attributes["data-marpagent-source-slide"]) || 1,
        });
    }
    return diagnostics;
}

function assertD2RenderSucceeded(html) {
    const diagnostics = collectD2RenderDiagnostics(html);
    if (diagnostics.length) {
        const error = new Error(
            diagnostics
                .map(
                    (item) =>
                        `D2 slide ${item.slide}, line ${item.line}: ${item.message}`,
                )
                .join("\n"),
        );
        error.code = "D2_RENDER_FAILED";
        error.diagnostics = diagnostics;
        throw error;
    }
    return diagnostics;
}

module.exports = {
    assertD2RenderSucceeded,
    collectD2RenderDiagnostics,
    escapeHtml,
};
