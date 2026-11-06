const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto");
const root = path.resolve(__dirname, "../../..");
const privateRoot = process.env.PRIVATE_DECKS;
if (
    !privateRoot ||
    !process.env.CANDIDATE_INPUT ||
    !process.env.COMPARISON_FONT ||
    !process.env.COMPARISON_OUTPUT
)
    throw Error(
        "Set PRIVATE_DECKS, CANDIDATE_INPUT, COMPARISON_FONT, and COMPARISON_OUTPUT. Keep private inputs and outputs outside the engine repository.",
    );
const { createConfiguredMarp } = require(root + "/src/slide-map");
const { chromium } = require(root + "/node_modules/playwright");
const { auditSlidesInPage } = require(root + "/src/visual-overflow");
const font = fs.readFileSync(process.env.COMPARISON_FONT).toString("base64");
const out = path.resolve(process.env.COMPARISON_OUTPUT);
if (out === root || out.startsWith(root + path.sep))
    throw Error("Private outputs must remain outside the public repository.");
fs.mkdirSync(out, { recursive: true });
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const cases = [
    ["06-22-lab-seminar", 3],
    ["06-22-lab-seminar", 5],
    ["08-24-toshiba-research-introduction", 2],
];
let browser;
(async () => {
    browser = await chromium.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
    });
    await page.route(/^https?:/, (r) => r.abort());
    const results = [];
    for (const [deck, num] of cases) {
        if (process.env.REPAIR && deck !== "08-24-toshiba-research-introduction") continue;
        const dir = privateRoot + "/decks/2026/" + deck;
        const source = fs.readFileSync(dir + "/slide.md", "utf8");
        const chunks = source.split(/^---\s*$/m);
        const front = chunks[1];
        const original = chunks[num + 1];
        const theme = front.match(/theme:\s*(\w+)/)[1];
        function embed(s) {
            return s
                .replace(/(?:src|url)=("[^"]+")/g, (m) => m)
                .replace(/src="([^"]+)"/g, (all, ref) => {
                    if (/^(data:|https?:)/.test(ref))
                        throw Error("External image");
                    let p = path.resolve(dir, ref);
                    if (ref.startsWith("shared/"))
                        p = path.resolve(
                            path.join(privateRoot, "assets"),
                            ref.slice(7),
                        );
                    const ext = path.extname(p).toLowerCase();
                    const mime =
                        ext === ".svg"
                            ? "image/svg+xml"
                            : ext === ".jpg" || ext === ".jpeg"
                              ? "image/jpeg"
                              : "image/png";
                    return `src="data:${mime};base64,${fs.readFileSync(p).toString("base64")}"`;
                });
        }
        async function measure(s, label) {
            const marp = createConfiguredMarp();
            marp.themeSet.add(
                fs.readFileSync(root + "/themes/" + theme + ".css", "utf8"),
            );
            const { html, css } = marp.render(
                "---" + front + "\nautoBody: false\n---\n" + embed(s),
            );
            await page.setContent(
                `<style>${css}\n@font-face{font-family:"Noto Sans JP";src:url(data:font/ttf;base64,${font});font-weight:100 900;}@font-face{font-family:"源ノ角ゴシック";src:url(data:font/ttf;base64,${font});font-weight:100 900;}section{--logos-dark:none;--logos-light:none;}</style>${html}`,
                { waitUntil: "domcontentloaded" },
            );
            await page.evaluate(async () => {
                await document.fonts.ready;
                await Promise.all([...document.images].map((i) => i.decode()));
            });
            const m = await page.evaluate(() => {
                const sec = document.querySelector("section");
                const rect = (n) => {
                    let r = n.getBoundingClientRect();
                    return [r.x, r.y, r.width, r.height];
                };
                const nodes = [
                    ...sec.querySelectorAll("h1,h2,h3,p,li,figcaption,img"),
                ];
                return {
                    text: sec.innerText.replaceAll("\u200b", ""),
                    geometry: nodes.map(rect),
                    type: nodes.map((n) => {
                        let c = getComputedStyle(n);
                        return [
                            c.fontFamily,
                            c.fontSize,
                            c.fontWeight,
                            c.lineHeight,
                            c.letterSpacing,
                        ];
                    }),
                    images: [...sec.querySelectorAll("img")].map((i) => ({
                        rect: rect(i),
                        natural: [i.naturalWidth, i.naturalHeight],
                        source: i.src,
                    })),
                    cols: [...sec.querySelector(".col").children].map(rect),
                };
            });
            m.contentHash = hash(m.text);
            delete m.text;
            m.images = m.images.map((i) => ({ ...i, source: hash(i.source) }));
            if (label) {
                m.audit = (
                    await page.evaluate(auditSlidesInPage, {
                        tolerancePx: 2,
                        overlapTolerancePx: 2,
                        mediaToleranceRatio: 0.02,
                        safeMarginPx: 20,
                        referenceHeightPx: 720,
                        referenceWidthPx: 1280,
                        bodyFloorPx: 12,
                        secondaryFloorPx: 8,
                    })
                )[0];
                const cdp = await page.context().newCDPSession(page);
                await cdp.send("DOM.enable");
                await cdp.send("CSS.enable");
                const { root: r } = await cdp.send("DOM.getDocument");
                const { nodeId } = await cdp.send("DOM.querySelector", {
                    nodeId: r.nodeId,
                    selector: "h2",
                });
                m.fonts = (
                    await cdp.send("CSS.getPlatformFontsForNode", { nodeId })
                ).fonts;
                await cdp.detach();
                await page.screenshot({
                    path: out + "/" + deck + "-" + num + "-" + label + ".png",
                });
                fs.writeFileSync(
                    out + "/" + deck + "-" + num + "-" + label + ".md",
                    s,
                );
            }
            return m;
        }
        function same(a, b) {
            return (
                a.contentHash === b.contentHash &&
                JSON.stringify(a.type) === JSON.stringify(b.type) &&
                a.geometry.length === b.geometry.length &&
                a.geometry.every((r, i) =>
                    r.every((v, j) => Math.abs(v - b.geometry[i][j]) < 0.5),
                ) &&
                JSON.stringify(a.images.map((i) => [i.source, i.natural])) ===
                    JSON.stringify(b.images.map((i) => [i.source, i.natural]))
            );
        }
        const variants = {
            original,
            legacy: fs.readFileSync(path.join(process.env.CANDIDATE_INPUT, `${deck}-${num}-legacy.md`), "utf8"),
            modern: fs.readFileSync(path.join(process.env.CANDIDATE_INPUT, `${deck}-${num}-modern.md`), "utf8"),
        };
        if (process.env.REPAIR && deck === "08-24-toshiba-research-introduction") {
            variants.body = variants.modern
                .replace('col visual fill shares', 'body col shares')
                .replace(/max-height: (380|280)px;?/g, '')
                .replace('margin-top: 0.5em;', '')
                .replace('--col-width:54.99945715255896%', '--col-width:55%');
            variants.fixed = variants.legacy
                .replace('max-height: 380px;', 'max-height: 300px;')
                .replace('max-height: 280px;', 'max-height: 200px;');
        }
        if (process.env.REPAIR) {
            for (const width of ["w-full", "w-3/4", "w-2/3", "w-1/2"]) {
                variants[width.replaceAll("/", "-")] = variants.legacy
                    .replace(/max-height: (380|280)px;?/g, '')
                    .replace(/<figure(?: style="[^"]*")?>/g, `<figure class="${width}">`);
            }
        }
        const conditions = {
            base: s => s,
            heading: s => s.replace(/^(## .+)$/m, "$1<br>追加条件と評価範囲"),
            caption: s => /<figcaption[ >]/.test(s)
                ? s.replace(/<\/figcaption>/, "<br>図の補足説明と評価条件</figcaption>")
                : s.replace(/<\/figure>/, "<figcaption>図の補足説明と評価条件</figcaption></figure>"),
        };
        for (const [condition, transform] of Object.entries(conditions)) {
            const measurements = {};
            for (const [arm, source] of Object.entries(variants)) {
                measurements[arm] = await measure(transform(source), `${condition}-${arm}`);
            }
            const invariants = Object.fromEntries(Object.entries(measurements).map(([arm, m]) => [arm, {
                contentPreserved: m.contentHash === measurements.original.contentHash,
                typographyPreserved: JSON.stringify(m.type) === JSON.stringify(measurements.original.type),
                imagesPreserved: JSON.stringify(m.images.map(i => [i.source, i.natural])) === JSON.stringify(measurements.original.images.map(i => [i.source, i.natural])),
            }]));
            const row = {
                deck, page: num, theme, condition,
                sourceHash: hash(original),
                legacyEquivalent: same(measurements.original, measurements.legacy),
                modernEquivalent: same(measurements.original, measurements.modern),
                measurements, invariants,
            };
            results.push(row);
            fs.writeFileSync(out + "/results.json", JSON.stringify(results, null, 2));
            console.log(JSON.stringify({deck, page:num, condition, legacyEquivalent:row.legacyEquivalent, modernEquivalent:row.modernEquivalent}));
        }

    }
})()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (browser) await browser.close();
    });
