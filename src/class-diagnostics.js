const fs = require("node:fs");
const path = require("node:path");
const { Parser } = require("htmlparser2");
const postcss = require("postcss");
const selectorParser = require("postcss-selector-parser");
const { isMap, parseDocument } = require("yaml");
const { parseSource } = require("./markdown-source");
const { normalizeMarkdown } = require("./markdown-input");
const { buildSlideMap, createConfiguredMarp } = require("./slide-map");

const THEME_DIR = path.join(__dirname, "..", "themes");
// The shipped font import provides font faces, not author-facing classes.
// Other imports, including the same URL in deck CSS, remain uninspected.
const THEME_FONT_IMPORT =
    'url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap")';
const DYNAMIC_CLASS = /\$\{|\{\{|<%|\[\[/;
const CLASS_BINDING =
    /^(?::class|v-bind:class|\[class(?:\.[^\]]+)?\]|class:.*)$/i;
const CLASS_SEPARATOR = /[\t\n\f\r ]+/;

/**
 * Inventory selector names, not computed applicability or cascade priority.
 * Comments and declaration values never contribute class definitions.
 */
function collectClassDefinitions(css, options = {}) {
    const classes = new Set();
    const unknownReasons = new Set();
    let root;
    try {
        root = postcss.parse(css);
    } catch {
        return { classes, unknownReasons: ["css-parse-error"] };
    }
    root.walkAtRules(/^import$/i, (rule) => {
        if (!options.fontOnlyImports?.includes(rule.params))
            unknownReasons.add("external-css");
    });
    root.walkRules((rule) => {
        for (let parent = rule.parent; parent; parent = parent.parent) {
            if (
                parent.type === "atrule" &&
                /(?:^|-)keyframes$/i.test(parent.name)
            )
                return;
        }
        try {
            const selector = selectorParser().astSync(rule.selector);
            selector.walkClasses((node) => classes.add(node.value));
            selector.walkAttributes((node) => {
                if (node.attribute !== "class") return;
                if (["=", "~="].includes(node.operator) && !node.insensitive) {
                    for (const name of node.value
                        .split(CLASS_SEPARATOR)
                        .filter(Boolean))
                        classes.add(name);
                } else {
                    unknownReasons.add("class-selector-pattern");
                }
            });
        } catch {
            unknownReasons.add("selector-parse-error");
        }
    });
    return { classes, unknownReasons: [...unknownReasons] };
}

function lineAt(source, index) {
    return source.slice(0, index).split("\n").length;
}

function slideAt(slideMap, line) {
    return (
        slideMap.find((entry) => line >= entry.line && line <= entry.endLine) ||
        slideMap[0]
    );
}

/** Parse only authored HTML. Generated Marp, diagram and math classes never enter this stream. */
function collectHtml(source, slideMap) {
    const uses = [];
    const styles = [];
    const comments = [];
    const unknownReasons = new Set();
    let offset = 0;
    const fragments = parseSource(source)
        .filter((fragment) => fragment.type === "html")
        .map((fragment) => {
            const item = {
                ...fragment,
                start: offset,
                end: offset + fragment.content.length,
            };
            offset = item.end + 1;
            return item;
        });
    const fragmentAt = (index) =>
        fragments.find(
            (fragment) => index >= fragment.start && index < fragment.end,
        );
    const position = (index) => {
        const fragment = fragmentAt(index);
        return fragment ? fragment.position(index - fragment.start) : null;
    };
    let attributes = [];
    let seenAttributes = new Set();
    let style = null;
    let parser;
    parser = new Parser({
        onopentagname() {
            attributes = [];
            seenAttributes = new Set();
        },
        onattribute(name, value) {
            // Browsers retain the first occurrence of a duplicate HTML attribute.
            if (seenAttributes.has(name)) return;
            seenAttributes.add(name);
            if (name !== "class" && !CLASS_BINDING.test(name)) return;
            const index = position(parser.startIndex);
            if (index === null) return;
            const line = lineAt(source, index);
            attributes.push({
                value,
                line,
                dynamic: name !== "class" || DYNAMIC_CLASS.test(value),
            });
        },
        onopentag(name, attrs) {
            if (name === "script") unknownReasons.add("dynamic-content");
            if (
                name === "link" &&
                /(?:^|\s)stylesheet(?:\s|$)/i.test(attrs.rel || "")
            )
                unknownReasons.add("external-css");
            if (name === "style") {
                const index = position(parser.startIndex);
                style = {
                    css: "",
                    slide:
                        "scoped" in attrs
                            ? slideAt(slideMap, lineAt(source, index ?? 0))
                                  ?.slide
                            : null,
                    fragment: fragmentAt(parser.startIndex),
                };
            }
            if (["script", "style"].includes(name)) return;
            for (const attribute of attributes) {
                if (!attribute.value.split(CLASS_SEPARATOR).some(Boolean))
                    continue;
                if (attribute.dynamic) unknownReasons.add("dynamic-content");
                for (const className of attribute.dynamic
                    ? [attribute.value]
                    : attribute.value.split(CLASS_SEPARATOR).filter(Boolean)) {
                    uses.push({
                        className,
                        line: attribute.line,
                        slide: slideAt(slideMap, attribute.line)?.slide,
                        dynamic: attribute.dynamic,
                    });
                }
            }
        },
        ontext(text) {
            if (style) style.css += text;
        },
        onclosetag(name, implied) {
            if (name !== "style" || !style) return;
            if (implied || fragmentAt(parser.startIndex) !== style.fragment)
                unknownReasons.add("css-source-unavailable");
            else styles.push({ css: style.css, slide: style.slide });
            style = null;
        },
        oncomment(body) {
            const index = position(parser.startIndex);
            if (index !== null)
                comments.push({
                    body: body.trim(),
                    rawBody: body,
                    line: lineAt(source, index),
                });
        },
    });
    parser.end(fragments.map((fragment) => fragment.content).join("\n"));
    return { uses, styles, comments, unknownReasons };
}

/** Observe directives before hidden-slide removal, without running any renderer. */
function parseDirectives(source) {
    const marp = createConfiguredMarp();
    const themes = new Map();
    for (const file of fs
        .readdirSync(THEME_DIR)
        .filter((name) => name.endsWith(".css"))) {
        const css = fs.readFileSync(path.join(THEME_DIR, file), "utf8");
        try {
            const theme = marp.themeSet.add(css);
            themes.set(theme.name, css);
        } catch {
            // A theme the engine cannot load must not yield definitive absence claims.
        }
    }
    let tokens = [];
    marp.markdown.core.ruler.before(
        "marpit_directives_apply",
        "marpagent_class_diagnostics",
        (state) => {
            if (!state.inlineMode) tokens = [...state.tokens];
        },
    );
    marp.markdown.parse(source, {});
    const themeName = marp.lastGlobalDirectives.theme;
    return {
        tokens,
        directives: marp.lastGlobalDirectives,
        themeCss: themeName ? themes.get(themeName) : marp.themeSet.default.css,
    };
}

function flattenTokens(tokens) {
    return tokens.flatMap((token) => [
        token,
        ...flattenTokens(token.children || []),
    ]);
}

function directiveKeyLines(text, firstLine) {
    const lines = new Map();
    if (typeof text !== "string") return lines;
    // Marp owns value interpretation, including its loose YAML mode. This
    // second parse observes root-key ranges only, never values or aliases.
    const document = parseDocument(text, { schema: "failsafe" });
    if (isMap(document.contents)) {
        for (const { key } of document.contents.items) {
            if (typeof key?.value === "string" && key.range) {
                lines.set(
                    key.value,
                    firstLine - 1 + lineAt(text, key.range[0]),
                );
            }
        }
    }
    return lines;
}

function collectSectionClasses(slideMap, tokens, html) {
    const frontmatter = tokens.find((token) => token.type === "front_matter");
    const frontmatterLines = directiveKeyLines(
        frontmatter?.meta,
        (frontmatter?.map?.[0] ?? 0) + 2,
    );
    let inheritedLine = frontmatterLines.get("class");
    const firstSpotLine = frontmatterLines.get("_class");
    const declarations = [];
    const remainingComments = [...html.comments];
    for (const token of flattenTokens(tokens)) {
        if (token.type !== "marpit_comment") continue;
        const index = remainingComments.findIndex(
            (comment) => comment.body === token.content.trim(),
        );
        const comment =
            index === -1 ? null : remainingComments.splice(index, 1)[0];
        const line = token.map ? token.map[0] + 1 : comment?.line;
        const parsed = token.meta?.marpitParsedDirectives;
        if (line && parsed)
            declarations.push({
                line,
                parsed,
                keyLines: directiveKeyLines(
                    comment?.rawBody ?? token.content,
                    line,
                ),
                slide: slideAt(slideMap, line)?.slide,
            });
    }
    const uses = [];
    for (const entry of slideMap) {
        const current = declarations.filter(
            (declaration) => declaration.slide === entry.slide,
        );
        const local = current
            .filter(({ parsed }) => Object.hasOwn(parsed, "class"))
            .at(-1);
        const spot = current
            .filter(({ parsed }) => Object.hasOwn(parsed, "_class"))
            .at(-1);
        if (local) inheritedLine = local.keyLines.get("class") || local.line;
        const line =
            spot?.keyLines.get("_class") ||
            spot?.line ||
            (entry.slide === 1 ? firstSpotLine : null) ||
            inheritedLine;
        const open = tokens.find(
            (token) =>
                token.type === "marpit_slide_open" &&
                token.meta?.marpitSlide === entry.slide - 1,
        );
        const classValue = open?.meta?.marpitDirectives?.class;
        if (!line || !classValue) continue;
        for (const className of String(classValue)
            .split(CLASS_SEPARATOR)
            .filter(Boolean)) {
            // `normal` is an intentional no-style marker in the shipped scaffold.
            if (className !== "normal")
                uses.push({
                    className,
                    line,
                    slide: entry.slide,
                    dynamic: DYNAMIC_CLASS.test(className),
                });
        }
    }
    return {
        uses,
        hasThemeDeclaration: Boolean(
            frontmatterLines.get("theme") ||
            declarations.some(({ parsed }) => Object.hasOwn(parsed, "theme")),
        ),
    };
}

function editDistance(left, right) {
    let previous = Array.from(
        { length: right.length + 1 },
        (_, index) => index,
    );
    for (let row = 1; row <= left.length; row++) {
        const current = [row];
        for (let column = 1; column <= right.length; column++) {
            current[column] = Math.min(
                current[column - 1] + 1,
                previous[column] + 1,
                previous[column - 1] +
                    (left[row - 1] === right[column - 1] ? 0 : 1),
            );
        }
        previous = current;
    }
    return previous[right.length];
}

function nearbyClasses(className, classes) {
    if (className.length > 80) return [];
    return [...classes]
        .filter(
            (candidate) => Math.abs(candidate.length - className.length) <= 2,
        )
        .map((candidate) => ({
            candidate,
            distance: editDistance(className, candidate),
        }))
        .filter(({ distance }) => distance <= 2)
        .sort(
            (a, b) =>
                a.distance - b.distance ||
                a.candidate.localeCompare(b.candidate, "en"),
        )
        .slice(0, 3)
        .map(({ candidate }) => candidate);
}

/**
 * Non-blocking source advice. A known name proves only a selector exists;
 * parent height, selector conditions, cascade and actual geometry are unmeasured.
 */
function findClassFindings(markdown, options = {}) {
    const source = normalizeMarkdown(markdown).replace(/\r\n|\r/g, "\n");
    const slideMap = options.slideMap || buildSlideMap(source);
    const html = collectHtml(source, slideMap);
    const parsed = parseDirectives(source);
    const section = collectSectionClasses(slideMap, parsed.tokens, html);
    const theme = collectClassDefinitions(options.themeCss ?? parsed.themeCss, {
        fontOnlyImports:
            options.themeCss === undefined ? [THEME_FONT_IMPORT] : [],
    });
    if (
        options.themeCss === undefined &&
        section.hasThemeDeclaration &&
        !parsed.directives.theme
    )
        theme.unknownReasons.unshift("theme-unavailable");
    const global = {
        classes: new Set(theme.classes),
        unknownReasons: new Set([
            ...theme.unknownReasons,
            ...html.unknownReasons,
        ]),
    };
    const scoped = new Map();
    const styles = [...html.styles];
    if (parsed.directives.style)
        styles.push({ css: parsed.directives.style, slide: null });
    for (const style of styles) {
        const target = style.slide
            ? scoped.get(style.slide) || {
                  classes: new Set(),
                  unknownReasons: new Set(),
              }
            : global;
        const inventory = collectClassDefinitions(style.css);
        for (const name of inventory.classes) target.classes.add(name);
        for (const reason of inventory.unknownReasons)
            target.unknownReasons.add(reason);
        if (style.slide) scoped.set(style.slide, target);
    }
    const findings = [];
    const seen = new Set();
    for (const use of [...html.uses, ...section.uses].sort(
        (a, b) => a.slide - b.slide || a.line - b.line,
    )) {
        const identity = slideMap.find((entry) => entry.slide === use.slide);
        if (!identity) continue;
        const local = scoped.get(use.slide);
        const classes = new Set([...global.classes, ...(local?.classes || [])]);
        if (!use.dynamic && classes.has(use.className)) continue;
        const reasons = use.dynamic
            ? ["dynamic-class"]
            : [...global.unknownReasons, ...(local?.unknownReasons || [])];
        const reason = reasons[0] || "not-in-css";
        const key = JSON.stringify([use.slide, use.line, use.className]);
        if (seen.has(key)) continue;
        seen.add(key);
        const candidates = reasons.length
            ? []
            : nearbyClasses(use.className, classes);
        findings.push({
            slide: identity.slide,
            renderedSlide: identity.renderedSlide,
            sectionId: identity.sectionId,
            page: identity.page,
            line: use.line,
            ruleId: reasons.length
                ? "class-availability-unknown"
                : "undefined-class",
            severity: "info",
            source: "classes",
            className: use.className,
            reason,
            unknownReasons: reasons,
            candidates,
            title: reasons.length
                ? `Class "${use.className}" has unknown availability (${reason}) at line ${use.line}.`
                : `Class "${use.className}" is absent from the inspected CSS at line ${use.line}.`,
            suggestion: reasons.length
                ? "Inspect the dynamic or external styles and the rendered slide; preserve intentional marker classes. Do not remove or rename this class automatically."
                : `${candidates.length ? `Nearby defined names: ${candidates.join(", ")}. ` : ""}Check the compiled theme or define the intended deck-local class; selector presence alone does not establish layout behavior.`,
        });
    }
    return findings;
}

module.exports = { collectClassDefinitions, findClassFindings };
