const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { parseArgs } = require("node:util");

const evidence = __dirname;
const root = path.resolve(evidence, "../../..");
const manifest = JSON.parse(
    fs.readFileSync(path.join(evidence, "manifest.json")),
);
const saved = JSON.parse(fs.readFileSync(path.join(evidence, "summary.json")));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const cache = new Map();

function readBlob(pin) {
    if (!cache.has(pin.blob)) {
        assert.match(pin.blob, /^[a-f0-9]{40}$/);
        const bytes = execFileSync("git", ["cat-file", "blob", pin.blob], {
            cwd: root,
        });
        assert.equal(
            sha(bytes),
            pin.sha256,
            `Historical input hash differs: ${pin.path}`,
        );
        cache.set(pin.blob, bytes);
    }
    return cache.get(pin.blob);
}

const source = readBlob(manifest.sources.fixture).toString();
const frontEnd = source.indexOf("\n---\n", 4) + 5;
assert(frontEnd > 5, "Missing fixture frontmatter");
const front = source.slice(0, frontEnd);
const slides = source.slice(frontEnd).split("\n---\n");
const caseId = (slide) => /<!-- case: ([\w-]+) -->/.exec(slide)?.[1];
const repairIds = saved.repair.selection;
const captionSlides = slides.filter((slide) =>
    /<!-- case: (figure|columns|stack|results)-/.test(slide),
);

function wrapResult(slide) {
    const start = slide.indexOf("<figure>");
    const end = slide.indexOf('<div class="footnote">');
    return `${slide.slice(0, start)}<div class="body box">\n${slide.slice(start, end)}</div>\n\n${slide.slice(end)}`;
}

function adaptCaptionDeck(slide) {
    if (caseId(slide).startsWith("columns-"))
        return slide.replace(
            'class="grid grid-cols-12 gap-6 items-start"',
            'class="body col visual" style="--visual-left: 2; --visual-right: 1; --visual-gap: 1.5rem"',
        );
    if (caseId(slide).startsWith("stack-"))
        return slide.replace(
            'class="flex flex-col gap-4"',
            'class="body box" style="--body-gap: 1rem"',
        );
    if (caseId(slide).startsWith("results-")) return wrapResult(slide);
    return slide
        .replace("<figure>", '<div class="body box">\n<figure>')
        .replace("</figure>", "</figure>\n</div>");
}

function buildInput(suite, theme, variant) {
    let selected;
    if (suite === "caption") {
        selected =
            variant === "after"
                ? captionSlides.map(adaptCaptionDeck)
                : captionSlides;
    } else {
        selected = repairIds.map((id) =>
            slides.find((slide) => caseId(slide) === id),
        );
        if (variant === "repaired")
            selected[0] = selected[0].replace(
                "<figure>",
                `<figure style="height: ${saved.repair.heightRepair.valuePx}px">`,
            );
        if (variant === "utility")
            selected[0] = selected[0].replace(
                "<figure>",
                '<figure class="w-3/4">',
            );
        if (variant === "body") {
            selected[0] =
                selected[0]
                    .replace(
                        '<div class="grid grid-cols-12 gap-6 items-start"',
                        '<div class="body">\n<div class="grid grid-cols-12 gap-6 items-stretch fill"',
                    )
                    .replace(
                        'class="col-span-8 min-w-0"',
                        'class="col-span-8 min-w-0 box"',
                    )
                    .replace(
                        'class="col-span-4 min-w-0"',
                        'class="col-span-4 min-w-0 box"',
                    ) + "\n</div>\n";
            selected[1] = wrapResult(selected[1]);
        }
    }
    const markdown =
        front.replace("theme: lab", `theme: ${theme}`) +
        selected.join("\n---\n");
    assert.equal(
        sha(markdown),
        manifest.inputSha256[suite][theme][variant],
        `Source recipe differs: ${suite}/${theme}/${variant}`,
    );
    return { markdown, ids: selected.map(caseId) };
}

function verify() {
    for (const file of [...manifest.files, ...manifest.images])
        assert.equal(
            sha(fs.readFileSync(path.join(evidence, file.file))),
            file.sha256,
            `Saved file differs: ${file.file}`,
        );
    for (const pin of [
        manifest.sources.packageLock,
        ...Object.values(manifest.sources.assets),
        ...Object.values(manifest.sources.css).flatMap(Object.values),
    ])
        readBlob(pin);
    for (const [suite, themes] of Object.entries(manifest.inputSha256))
        for (const [theme, variants] of Object.entries(themes))
            for (const variant of Object.keys(variants))
                buildInput(suite, theme, variant);
}

function mediaAndFonts(markdown, svgFont) {
    return markdown.replace(/src="assets\/img\/([^"<>]+)"/g, (_, name) => {
        const svg = readBlob(manifest.sources.assets[name])
            .toString()
            .replace(
                /(<svg\b[^>]*>)/,
                `$1<style>@font-face {font-family: "Noto Sans JP"; font-weight: 100 900; src: url(data:font/woff2;base64,${svgFont});}</style>`,
            );
        return `src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"`;
    });
}

async function measure(page, input) {
    const { auditSlidesInPage } = require(
        path.join(root, "src/visual-overflow"),
    );
    const audits = await page.evaluate(auditSlidesInPage, {
        tolerancePx: 2,
        overlapTolerancePx: 2,
        mediaToleranceRatio: 0.02,
        safeMarginPx: 20,
        referenceWidthPx: 1280,
        referenceHeightPx: 720,
        bodyFloorPx: 12,
        secondaryFloorPx: 8,
    });
    const metrics = await page.locator("section").evaluateAll((sections) =>
        sections.map((section) => {
            const slide = section.getBoundingClientRect();
            const rect = (element) => {
                if (!element) return null;
                const r = element.getBoundingClientRect();
                return {
                    top: r.top - slide.top,
                    bottom: r.bottom - slide.top,
                    left: r.left - slide.left,
                    width: r.width,
                    height: r.height,
                };
            };
            const clone = section.cloneNode(true);
            clone
                .querySelectorAll("style, script")
                .forEach((node) => node.remove());
            const captions = [...section.querySelectorAll("figcaption")];
            const captionLines = captions.map((caption) => {
                const range = document.createRange();
                range.selectNodeContents(caption);
                return new Set([...range.getClientRects()].map((r) => r.top))
                    .size;
            });
            const media = [...section.querySelectorAll("img")].map((image) => {
                const r = rect(image);
                const scale = Math.min(
                    r.width / image.naturalWidth,
                    r.height / image.naturalHeight,
                );
                return {
                    ...r,
                    sourceWidth: image.naturalWidth,
                    sourceHeight: image.naturalHeight,
                    fit: getComputedStyle(image).objectFit,
                    sourceLabel24pxPainted: 24 * scale,
                };
            });
            const figure = rect(section.querySelector("figure"));
            const paragraphs = [
                ...section.querySelectorAll(":scope > p, :scope > .body > p"),
            ].map(rect);
            const emphasis = (selector) =>
                [...section.querySelectorAll(selector)].map((element) => ({
                    text: element.textContent.replaceAll("\u200b", ""),
                    color: getComputedStyle(element).color,
                    background: getComputedStyle(element).backgroundColor,
                }));
            return {
                text: clone.textContent
                    .replaceAll("\u200b", "")
                    .replace(/\s+/g, " ")
                    .trim(),
                alt: section.querySelector("img").getAttribute("alt"),
                fonts: {
                    heading: getComputedStyle(section.querySelector("h2"))
                        .fontSize,
                    caption: getComputedStyle(captions[0]).fontSize,
                    loaded: document.fonts.check('26px "Noto Sans JP"', "条件"),
                },
                figure,
                caption: rect(captions[0]),
                captionLines,
                media,
                evidence: rect(
                    section.querySelector('[data-region="evidence"]'),
                ),
                interpretation: rect(
                    section.querySelector('[data-region="interpretation"]'),
                ),
                footnote: rect(section.querySelector(".footnote")),
                contentBottom: Math.max(
                    figure.bottom,
                    ...paragraphs.map((p) => p.bottom),
                ),
                bold: emphasis("strong"),
                markers: emphasis("mark"),
            };
        }),
    );
    return metrics.map(({ text, alt, ...metric }, index) => ({
        id: input.ids[index],
        ...metric,
        textSha256: sha(text),
        altSha256: sha(alt),
        findings: Object.fromEntries(
            ["clipped", "overlaps", "crowded", "smallText"].map((key) => [
                key,
                audits[index][key].length,
            ]),
        ),
    }));
}

function checkRepair(item, original) {
    for (const key of ["textSha256", "altSha256", "fonts", "bold", "markers"])
        assert.deepEqual(item[key], original[key]);
    assert.equal(
        Object.values(item.findings).reduce((sum, n) => sum + n, 0),
        0,
    );
    assert(item.contentBottom <= manifest.conditions.safeBodyBottom + 1);
    if (item.footnote) assert(item.contentBottom < item.footnote.top);
    assert.equal(item.media[0].fit, "contain");
    assert(item.media[0].sourceLabel24pxPainted >= 12);
    if (item.evidence) {
        assert(Math.abs(item.evidence.width - original.evidence.width) < 0.1);
        assert(
            Math.abs(
                item.interpretation.width - original.interpretation.width,
            ) < 0.1,
        );
        assert(
            Math.abs(item.interpretation.left - original.interpretation.left) <
                0.1,
        );
    }
}

async function main() {
    const { values: args } = parseArgs({
        options: {
            verify: { type: "boolean" },
            font: { type: "string" },
            "svg-font": { type: "string" },
            output: { type: "string" },
            suite: { type: "string", default: "all" },
            theme: { type: "string", default: "all" },
        },
    });
    verify();
    if (args.verify) {
        console.log(
            "Verified 5 PNG hashes, summary, labels, historical blobs, and all 18 input recipes.",
        );
        return;
    }
    assert(
        args.font && args["svg-font"] && args.output,
        "Pass --font TTF --svg-font WOFF2 --output EMPTY_DIRECTORY, or --verify",
    );
    assert(["all", "repair", "caption"].includes(args.suite));
    assert(["all", "lab", "muji", "toshiba"].includes(args.theme));
    const font = fs.readFileSync(args.font);
    const svgFont = fs.readFileSync(args["svg-font"]);
    assert.equal(
        sha(font),
        manifest.conditions.font.sha256,
        "TTF hash differs",
    );
    assert.equal(
        sha(svgFont),
        manifest.conditions.svgFont.sha256,
        "SVG font hash differs",
    );
    const output = path.resolve(args.output);
    assert(
        !fs.existsSync(output) || fs.readdirSync(output).length === 0,
        "Output must be empty; archived evidence is never overwritten",
    );
    fs.mkdirSync(path.join(output, "figures"), { recursive: true });
    const { chromium } = require(path.join(root, "node_modules/playwright"));
    const { createConfiguredMarp } = require(path.join(root, "src/slide-map"));
    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const result = {
        node: process.versions.node,
        chromium: browser.version(),
        fontSha256: sha(font),
        svgFontSha256: sha(svgFont),
        runs: [],
    };
    try {
        const page = await browser.newPage({
            viewport: manifest.conditions.viewport,
            deviceScaleFactor: 1,
        });
        await page.route(
            /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            (route) => route.abort(),
        );
        for (const suite of args.suite === "all"
            ? ["repair", "caption"]
            : [args.suite]) {
            for (const theme of args.theme === "all"
                ? ["lab", "muji", "toshiba"]
                : [args.theme]) {
                let original;
                for (const variant of Object.keys(
                    manifest.inputSha256[suite][theme],
                )) {
                    const input = buildInput(suite, theme, variant);
                    const css = readBlob(
                        manifest.sources.css[theme][
                            ["body", "after"].includes(variant)
                                ? "after"
                                : "before"
                        ],
                    ).toString();
                    const marp = createConfiguredMarp();
                    marp.themeSet.add(css);
                    const rendered = marp.render(
                        mediaAndFonts(
                            input.markdown,
                            svgFont.toString("base64"),
                        ),
                    );
                    await page.setContent(
                        `<style>body { margin: 0; } ${rendered.css} @font-face {font-family: "Noto Sans JP"; font-weight: 100 900; src: url(data:font/ttf;base64,${font.toString("base64")});}</style>${rendered.html}`,
                    );
                    await page
                        .locator("img")
                        .evaluateAll((images) =>
                            Promise.all(images.map((image) => image.decode())),
                        );
                    await page.evaluate(() => document.fonts.ready);
                    const all = await measure(page, input);
                    const selection = saved[suite].selection;
                    const cases = all.filter((item) =>
                        selection.includes(item.id),
                    );
                    result.runs.push({
                        suite,
                        theme,
                        variant,
                        inputSha256: sha(input.markdown),
                        cases,
                    });
                    if (!original) original = cases;
                    else
                        for (const [index, item] of cases.entries()) {
                            if (suite === "repair")
                                checkRepair(item, original[index]);
                            else {
                                assert.equal(
                                    item.textSha256,
                                    original[index].textSha256,
                                );
                                assert.deepEqual(
                                    item.fonts,
                                    original[index].fonts,
                                );
                                assert.deepEqual(
                                    item.captionLines,
                                    original[index].captionLines,
                                );
                                assert.equal(
                                    Object.values(item.findings).reduce(
                                        (sum, n) => sum + n,
                                        0,
                                    ),
                                    0,
                                );
                            }
                        }
                    for (const image of manifest.images.filter(
                        (item) =>
                            item.suite === suite &&
                            item.theme === theme &&
                            item.variant === variant,
                    ))
                        await page
                            .locator("section")
                            .nth(input.ids.indexOf(image.id))
                            .screenshot({
                                path: path.join(output, image.file),
                            });
                }
            }
        }
        console.log(
            `Reproduced ${result.runs.length} runs; saved result.json and selected PNGs to the new output directory.`,
        );
    } finally {
        fs.writeFileSync(
            path.join(output, "result.json"),
            JSON.stringify(result, null, 2) + "\n",
        );
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
