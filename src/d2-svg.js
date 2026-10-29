const crypto = require("node:crypto");
const { SaxesParser } = require("saxes");
const css = require("css-tree");
const fontkit = require("fontkit");

const SVG_NS = "http://www.w3.org/2000/svg";
const FONT_DATA =
    /^data:(?:application\/(?:font-woff|x-font-ttf|octet-stream)|font\/(?:woff2?|ttf|otf));base64,[A-Za-z0-9+/=]+$/;
// Restrict functions to static values. Resource functions such as image-set()
// accept String nodes as URLs, so checking only CSS Url nodes is insufficient.
const STATIC_CSS_FUNCTIONS = new Set([
    "rgb",
    "rgba",
    "hsl",
    "hsla",
    "hwb",
    "lab",
    "lch",
    "oklab",
    "oklch",
    "color",
    "color-mix",
    "format",
    "tech",
]);
const FORBIDDEN_ELEMENTS = new Set([
    "script",
    "foreignobject",
    "image",
    "a",
    "animate",
    "animatemotion",
    "animatetransform",
    "set",
    "discard",
]);
const escapeXml = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (char) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&apos;",
            })[char],
    );

function invalid(detail) {
    const error = new Error(`D2 SVG rejected: ${detail}`);
    error.code = "D2_SVG_INVALID";
    throw error;
}

// Parse XML and CSS before rewriting IDs. Regex replacements cannot keep SVG
// links, marker URLs, CSS ID selectors and nested math definitions consistent.
function prepareD2Svg(source, salt) {
    let root;
    const stack = [];
    const elements = [];
    const ids = new Map();
    const rootId = `marpagent-d2-${crypto.createHash("sha256").update(String(salt)).digest("hex").slice(0, 20)}`;
    const parser = new SaxesParser({ xmlns: true });
    parser.on("error", (error) => invalid(error.message));
    parser.on("doctype", () => invalid("DOCTYPE is not supported"));
    parser.on("processinginstruction", () =>
        invalid("processing instructions are not supported"),
    );
    parser.on("opentag", (tag) => {
        if (
            tag.uri !== SVG_NS ||
            FORBIDDEN_ELEMENTS.has(tag.local.toLowerCase())
        )
            invalid(`unsupported element ${tag.name}`);
        const node = {
            name: tag.name,
            local: tag.local,
            attributes: {},
            children: [],
        };
        for (const attribute of Object.values(tag.attributes)) {
            if (attribute.name === "xml:base") invalid("external XML base");
            if (/^on/i.test(attribute.local))
                invalid(`event attribute ${attribute.name}`);
            node.attributes[attribute.name] = attribute.value;
        }
        const id = node.attributes.id;
        if (id !== undefined) {
            if (!id || ids.has(id)) invalid(`duplicate or empty ID ${id}`);
            ids.set(id, `${rootId}-${ids.size}`);
        }
        if (stack.length) stack.at(-1).children.push(node);
        else if (root) invalid("multiple roots");
        else root = node;
        stack.push(node);
        elements.push(node);
    });
    parser.on("closetag", () => stack.pop());
    const addText = (value) => {
        if (stack.length) stack.at(-1).children.push(value);
        else if (value.trim()) invalid("text outside SVG");
    };
    parser.on("text", addText);
    parser.on("cdata", addText);
    try {
        parser.write(String(source)).close();
    } catch (error) {
        if (error.code === "D2_SVG_INVALID") throw error;
        invalid(error.message);
    }
    if (!root || root.local !== "svg") invalid("missing SVG root");
    const box = (root.attributes.viewBox || "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    if (
        box.length !== 4 ||
        !box.every(Number.isFinite) ||
        box[2] <= 0 ||
        box[3] <= 0
    )
        invalid("a finite positive viewBox is required");
    if (root.attributes.id) ids.set(root.attributes.id, rootId);
    const styles = [];
    const embeddedFonts = new Map();
    const fontClasses = new Map();
    const fontNames = new Map();
    const parseCss = (value, context) => {
        try {
            return css.parse(value, {
                context,
                parseCustomProperty: true,
                onParseError: (error) => {
                    throw error;
                },
            });
        } catch (error) {
            invalid(`invalid CSS: ${error.message}`);
        }
    };
    for (const element of elements) {
        if (element.local !== "style") continue;
        if (element.children.some((child) => typeof child !== "string"))
            invalid("markup inside style");
        const ast = parseCss(element.children.join(""), "stylesheet");
        styles.push({ element, ast });
        css.walk(ast, {
            visit: "Atrule",
            enter(node) {
                if (!["font-face", "media"].includes(node.name.toLowerCase()))
                    invalid(`unsupported CSS @${node.name}`);
                if (node.name.toLowerCase() === "font-face") {
                    node.block?.children.forEach((declaration) => {
                        if (
                            declaration.type !== "Declaration" ||
                            declaration.property.toLowerCase() !== "font-family"
                        )
                            return;
                        const family = declaration.value.children?.first;
                        if (
                            !family ||
                            !["Identifier", "String"].includes(family.type)
                        )
                            invalid("unsupported font family");
                        const name = family.name || family.value;
                        fontNames.set(name, `${rootId}-${name}`);
                    });
                }
            },
        });
    }
    function reference(value) {
        if (!value.startsWith("#") || !ids.has(value.slice(1)))
            invalid(`unresolved or external reference ${value.slice(0, 120)}`);
        return `#${ids.get(value.slice(1))}`;
    }
    // Fixed D2 uses a class for each emitted font face. Resolve that class
    // instead of accepting a glyph that happens to exist in another face.
    for (const { ast } of styles)
        css.walk(ast, {
            visit: "Rule",
            enter(node) {
                const declaration = node.block?.children
                    ?.toArray()
                    .find(
                        (item) =>
                            item.type === "Declaration" &&
                            item.property === "font-family",
                    );
                const familyNode = declaration?.value.children?.first;
                if (
                    !familyNode ||
                    !["Identifier", "String"].includes(familyNode.type)
                )
                    return;
                const family = familyNode.name || familyNode.value;
                node.prelude?.children?.forEach((selector) => {
                    let lastClass;
                    css.walk(selector, {
                        visit: "ClassSelector",
                        enter(item) {
                            lastClass = item.name;
                        },
                    });
                    if (lastClass)
                        fontClasses.set(
                            lastClass,
                            fontNames.get(family) || family,
                        );
                });
            },
        });
    function rewriteCss(ast, scope) {
        css.walk(ast, function (node) {
            if (node.type === "Raw") invalid("unparsed CSS");
            if (node.type === "Url") {
                if (node.value.startsWith("#"))
                    node.value = reference(node.value);
                else if (
                    this.atrule?.name === "font-face" &&
                    this.declaration?.property === "src" &&
                    FONT_DATA.test(node.value)
                ) {
                    try {
                        const familyDeclaration = this.atrule.block.children
                            .toArray()
                            .find(
                                (item) =>
                                    item.type === "Declaration" &&
                                    item.property === "font-family",
                            );
                        const familyNode =
                            familyDeclaration?.value.children?.first;
                        const name = familyNode?.name || familyNode?.value;
                        embeddedFonts.set(
                            fontNames.get(name) || name,
                            fontkit.create(
                                Buffer.from(
                                    node.value.slice(
                                        node.value.indexOf(",") + 1,
                                    ),
                                    "base64",
                                ),
                            ),
                        );
                    } catch {
                        invalid("invalid embedded font");
                    }
                } else invalid("external CSS resource");
            }
            if (
                node.type === "Function" &&
                !STATIC_CSS_FUNCTIONS.has(
                    css.ident.decode(node.name).toLowerCase(),
                )
            )
                invalid(`unsupported CSS function ${node.name}`);
            if (node.type === "IdSelector")
                node.name = reference(`#${node.name}`).slice(1);
            if (this.declaration?.property.toLowerCase() === "font-family") {
                if (node.type === "Identifier" && fontNames.has(node.name))
                    node.name = fontNames.get(node.name);
                if (node.type === "String" && fontNames.has(node.value))
                    node.value = fontNames.get(node.value);
            }
        });
        if (scope)
            css.walk(ast, {
                visit: "Rule",
                enter(node) {
                    if (node.prelude?.type !== "SelectorList")
                        invalid("unsupported CSS selector");
                    node.prelude.children.forEach((selector) => {
                        selector.children.prependData({
                            type: "Combinator",
                            name: " ",
                        });
                        selector.children.prependData({
                            type: "IdSelector",
                            name: rootId,
                        });
                    });
                },
            });
        const result = css.generate(ast);
        if (result.includes("<")) invalid("HTML delimiter inside CSS");
        return result;
    }
    for (const { element, ast } of styles)
        element.children = [rewriteCss(ast, true)];
    for (const element of elements) {
        for (const [name, value] of Object.entries(element.attributes)) {
            const local = name.split(":").at(-1).toLowerCase();
            if (name === "id") element.attributes[name] = ids.get(value);
            else if (local === "href" || local === "src")
                element.attributes[name] = reference(value);
            else if (name === "style")
                element.attributes[name] = rewriteCss(
                    parseCss(value, "declarationList"),
                    false,
                );
            else if (["aria-labelledby", "aria-describedby"].includes(name))
                element.attributes[name] = value
                    .split(/\s+/)
                    .map((id) => reference(`#${id}`).slice(1))
                    .join(" ");
            else if (name === "font-family" && fontNames.has(value))
                element.attributes[name] = fontNames.get(value);
            else if (
                [
                    "fill",
                    "stroke",
                    "filter",
                    "clip-path",
                    "mask",
                    "marker-start",
                    "marker-mid",
                    "marker-end",
                    "cursor",
                ].includes(name) ||
                /url\s*\(/i.test(value)
            )
                element.attributes[name] = rewriteCss(
                    parseCss(value, "value"),
                    false,
                );
            else if (
                ["width", "height"].includes(name) &&
                !/^(?:(?:\d+(?:\.\d+)?|\.\d+)(?:px|%|em|ex|pt|pc|mm|cm|in)?|auto)$/.test(
                    value,
                )
            )
                invalid(`invalid ${name}`);
        }
        // The compiler already measured these labels; slide typography must not
        // replace their font size after layout. Whole-diagram scaling stays CSS.
        if (
            ["text", "tspan"].includes(element.local) &&
            element.attributes["font-size"]
        ) {
            const size = element.attributes["font-size"];
            if (!/^(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|ex|pt)?$/.test(size))
                invalid("invalid label font size");
            element.attributes.style = `${element.attributes.style || ""};font-size:${/\d$/.test(size) ? `${size}px` : size}`;
        }
    }
    // D2's bundled Latin font does not cover Japanese. Never count browser/OS
    // fallback as a self-contained diagram: inspect the emitted font subsets.
    function collectText(node, isText = false, family) {
        if (typeof node === "string") {
            if (isText)
                for (const character of node)
                    if (
                        character.codePointAt(0) > 127 &&
                        !/\s/u.test(character)
                    )
                        if (
                            !embeddedFonts
                                .get(family)
                                ?.hasGlyphForCodePoint?.(
                                    character.codePointAt(0),
                                )
                        )
                            invalid(
                                `embedded fonts lack glyph ${character} in ${family || "the selected face"}; set MARP_AGENT_D2_FONT_PATH or MARP_AGENT_D2_FONT_ITALIC_PATH to a suitable TTF file`,
                            );
            return;
        }
        if (node.local === "style") return;
        family = node.attributes["font-family"] || family;
        for (const name of (node.attributes.class || "").split(/\s+/))
            if (fontClasses.has(name)) family = fontClasses.get(name);
        for (const child of node.children)
            collectText(
                child,
                isText || ["text", "tspan"].includes(node.local),
                family,
            );
    }
    collectText(root);
    root.attributes.id = rootId;
    const serialize = (node) => {
        if (typeof node === "string") return escapeXml(node);
        const attributes = Object.entries(node.attributes)
            .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
            .join("");
        const content =
            node.local === "style"
                ? node.children.join("")
                : node.children.map(serialize).join("");
        return `<${node.name}${attributes}>${content}</${node.name}>`;
    };
    return serialize(root);
}

module.exports = { prepareD2Svg };
