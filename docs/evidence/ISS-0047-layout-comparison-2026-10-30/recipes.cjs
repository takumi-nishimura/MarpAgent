const assert = require("node:assert/strict");

const themes = ["lab", "muji", "toshiba"];
const families = [
    "figure-standard", "columns-standard", "stack-standard", "results-standard",
    "columns-portrait", "stack-taller-media", "results-footnote-wrap",
];
const widths = [null, "w-full", "w-3/4", "w-1/2", "w-1/3", "w-1/4"];
const headingSuffix = "：図と説明を読む前に，比較の前提と適用範囲を一緒に確認する";
const captionSuffix = "この例は図と説明の配置確認用であり，実験結果を示すものではない．条件の違いに関する推論や，実際の装置・利用者への一般化は行わない．";
const columnCaptionSuffix = "この例は配置確認用であり，実験結果を示すものではない．入力条件と単位も保持する．";
const stackCaptionSuffix = captionSuffix + "図中の入力・処理・出力の順序だけを確認する．";

function inputs(source) {
    const frontEnd = source.indexOf("\n---\n", 4) + 5;
    assert(frontEnd > 5);
    const slides = source.slice(frontEnd).split("\n---\n");
    const cases = families.flatMap((family) => {
        const original = slides.find((slide) => slide.includes(`<!-- case: ${family} -->`));
        assert(original, family);
        return ["base", "heading", "caption"].map((growth) => {
            const id = `${family}--${growth}`;
            let markdown = original.replace(`case: ${family}`, `case: ${id}`);
            if (growth === "heading") markdown = markdown.replace(/^(## .+)$/m, `$1${headingSuffix}`);
            // Change only the last caption in a two-figure stack.
            if (growth === "caption") {
                const at = markdown.lastIndexOf("</figcaption>");
                const suffix = family.startsWith("columns-") ? columnCaptionSuffix : family.startsWith("stack-") ? stackCaptionSuffix : captionSuffix;
                markdown = markdown.slice(0, at) + suffix + markdown.slice(at);
            }
            return { id, family, growth, markdown, figures: [...markdown.matchAll(/<figure>/g)].length };
        });
    });
    return { front: source.slice(0, frontEnd), cases };
}

function body(item) {
    let slide = item.markdown;
    if (item.family.startsWith("columns-")) {
        slide = slide.replace('class="grid grid-cols-12 gap-6 items-start"',
            'class="grid grid-cols-12 gap-6 items-stretch fill"')
            .replace('class="col-span-8 min-w-0"', 'class="col-span-8 min-w-0 box"');
        const at = slide.indexOf('<div class="grid');
        return slide.slice(0, at) + '<div class="body">\n' + slide.slice(at) + "\n</div>\n";
    }
    if (item.family.startsWith("stack-")) {
        // Use the same token expression as gap-4; Marp transforms theme rem units.
        return slide.replace('class="flex flex-col gap-4"', 'class="body" style="--body-gap: calc(var(--spacing) * 4)"');
    }
    const start = slide.indexOf("<figure>");
    const footnote = slide.indexOf('<div class="footnote">');
    const end = footnote === -1 ? slide.length : footnote;
    return slide.slice(0, start) + '<div class="body">\n' + slide.slice(start, end) + "\n</div>\n" + slide.slice(end);
}

function legacy(item, choices) {
    let index = 0;
    return item.markdown.replace(/<figure>/g, () => {
        const width = choices[index++];
        return width ? `<figure class="${width}">` : "<figure>";
    });
}

function candidates(item) {
    let products = [[]];
    for (let i = 0; i < item.figures; i++) products = products.flatMap((prefix) => widths.map((width) => [...prefix, width]));
    const result = products.map((choices) => ({
        id: choices.map((width) => width || "natural").join("+"),
        adjustmentType: "utility",
        choices,
        adjustments: choices.filter(Boolean).length,
        markdown: legacy(item, choices),
    }));
    // A single height also repairs all portrait growth states. Keep this
    // alternative so utility readjustment is not presented as unavoidable.
    if (item.family === "columns-portrait") result.push({
        id: "height-460", choices: ["height:460px"], adjustmentType: "inline-height", adjustments: 1,
        markdown: item.markdown.replace("<figure>", '<figure style="height: 460px">'),
    });
    return result;
}

function counts(markdown) {
    const divs = [...markdown.matchAll(/<div\b[^>]*>/g)].map(([tag]) => tag);
    const tokens = [...markdown.matchAll(/\bclass="([^"]*)"/g)].flatMap(([, list]) => list.split(/\s+/));
    const declarations = [...markdown.matchAll(/\bstyle="([^"]*)"/g)].flatMap(([, style]) => style.split(";").filter((part) => part.trim()));
    return {
        wrappers: divs.filter((tag) => !tag.includes('class="footnote"')).length,
        classTokens: tokens.length,
        layoutClassTokens: tokens.filter((token) => token !== "footnote").length,
        widthUtilities: tokens.filter((token) => widths.includes(token)).length,
        inlineDeclarations: declarations.length,
        caseSizeDeclarations: declarations.filter((part) => /^(?:\s*)(?:width|height|min-width|max-width|min-height|max-height|--body-bottom-safe)\s*:/.test(part)).length,
        compositionParameters: declarations.filter((part) => part.includes("--body-gap:")).length,
        scopedRules: 0,
    };
}

module.exports = { themes, families, widths, headingSuffix, captionSuffix, columnCaptionSuffix, stackCaptionSuffix, inputs, body, legacy, candidates, counts };
