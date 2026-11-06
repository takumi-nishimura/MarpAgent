const fs = require("fs"),
    path = require("path"),
    crypto = require("crypto");
const root = path.resolve(__dirname, "../../..");
const privateRoot = process.env.PRIVATE_DECKS;
if (
    !privateRoot ||
    !process.env.COMPARISON_FONT ||
    !process.env.COMPARISON_OUTPUT
)
    throw Error(
        "Set PRIVATE_DECKS, COMPARISON_FONT, COMPARISON_OUTPUT outside the engine repository.",
    );
const { createConfiguredMarp } = require(root + "/src/slide-map");
const { chromium } = require(root + "/node_modules/playwright");
const { auditSlidesInPage } = require(root + "/src/visual-overflow");
const { parseDocument } = require(root + "/node_modules/htmlparser2");
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
        const baseline = await measure(original, "original");
        const trials = [];
        async function minimize(s, mode) {
            if (process.env.RECHECK_CANDIDATES) {
                s = fs.readFileSync(
                    out + "/" + deck + "-" + num + "-" + mode + ".md",
                    "utf8",
                );
                if (!same(baseline, await measure(s)))
                    throw Error("Cached reduction changed geometry");
                const candidate = s.replace(
                    /<div([^>]*?)style="([^"]*?)justify-content: center;([^"]*)"([^>]*)>/g,
                    (_, a, b, c, d) => {
                        let tag =
                            "<div" + a + 'style="' + b + c + '"' + d + ">";
                        return tag.includes('class="')
                            ? tag.replace('class="', 'class="place-middle ')
                            : tag.replace("<div", '<div class="place-middle"');
                    },
                );
                if (same(baseline, await measure(candidate))) s = candidate;
                return s;
            }
            let changed = true;
            while (changed) {
                changed = false;
                const styles = [...s.matchAll(/style="([^"]*)"/g)];
                outer: for (const match of styles) {
                    for (const decl of match[1]
                        .split(";")
                        .filter((x) => x.trim())) {
                        if (
                            /background|color|font|--visual|--col-width/.test(
                                decl,
                            )
                        )
                            continue;
                        const next = match[1]
                            .split(";")
                            .filter((d) => d !== decl)
                            .join(";");
                        const candidate =
                            s.slice(0, match.index) +
                            (next.trim() ? `style="${next}"` : "") +
                            s.slice(match.index + match[0].length);
                        const measured = await measure(candidate);
                        const accepted = same(baseline, measured);
                        trials.push({
                            mode,
                            property: decl.split(":")[0].trim(),
                            accepted,
                        });
                        console.log(
                            mode,
                            trials.length,
                            decl.split(":")[0].trim(),
                            accepted,
                        );
                        if (accepted) {
                            s = candidate;
                            changed = true;
                            break outer;
                        }
                    }
                }
            }
            return s;
        }
        const legacy = await minimize(original, "legacy");
        let modern = original.replace(
            /align-self: stretch; display: flex; align-items: center; justify-content: center;/g,
            "",
        );
        // Replace only the authored center-alignment group with existing utilities.
        modern = original.replace(
            /<div style="([^"]*?)align-self: stretch; display: flex; align-items: center; justify-content: center;([^"]*)">/g,
            '<div class="box place-middle place-center self-stretch" style="$1$2">',
        );
        let pre = await measure(modern);
        const utilityEquivalent = same(baseline, pre);
        if (!utilityEquivalent) modern = original;
        const colMatch = modern.match(
            /<div class="col([^\"]*)"(?: style="([^"]*)")?>/,
        );
        let shareEquivalent = false;
        if (colMatch) {
            const ratio =
                baseline.cols[0][2] /
                baseline.cols.reduce((sum, r) => sum + r[2], 0);
            let candidate = modern.replace(
                colMatch[0],
                `<div class="col${colMatch[1]} shares"${colMatch[2] ? ` style="${colMatch[2].replace(/--visual-(left|right):[^;]+;?/g, "")}"` : ""}>`,
            );
            const start = candidate.indexOf(' shares"');
            const child = candidate.indexOf("<div", start);
            if (child >= 0) {
                const end = candidate.indexOf(">", child);
                let tag = candidate
                    .slice(child, end + 1)
                    .replace(/flex:\s*[0-9.]+;?/, "");
                tag = tag.includes('style="')
                    ? tag.replace(
                          'style="',
                          `style="--col-width:${ratio * 100}%;`,
                      )
                    : tag.replace(">", ` style="--col-width:${ratio * 100}%">`);
                candidate =
                    candidate.slice(0, child) + tag + candidate.slice(end + 1);
                const probe = await measure(candidate);
                shareEquivalent = same(baseline, probe);
                if (shareEquivalent) modern = candidate;
            }
        }
        modern = await minimize(modern, "modern");
        const lm = await measure(legacy, "legacy"),
            nm = await measure(modern, "modern");
        function counts(s) {
            const doc = parseDocument(s);
            let wrappers = 0,
                classes = 0,
                inline = 0;
            function walk(n) {
                if (n.type === "tag") {
                    if (n.name === "div") wrappers++;
                    classes += (n.attribs.class || "")
                        .split(/\s+/)
                        .filter(Boolean).length;
                    inline += (n.attribs.style || "")
                        .split(";")
                        .filter((x) => x.trim()).length;
                }
                (n.children || []).forEach(walk);
            }
            walk(doc);
            return { wrappers, classes, inline };
        }
        results.push({
            deck,
            page: num,
            theme,
            sourceHash: hash(original),
            counts: {
                original: counts(original),
                legacy: counts(legacy),
                modern: counts(modern),
            },
            utilityEquivalent,
            shareEquivalent,
            legacyEquivalent: same(baseline, lm),
            modernEquivalent: same(baseline, nm),
            trials,
            baseline,
            legacy: lm,
            modern: nm,
        });
        fs.writeFileSync(
            out + "/results.json",
            JSON.stringify(results, null, 2),
        );
        console.log(
            JSON.stringify({
                deck,
                page: num,
                counts: results.at(-1).counts,
                utilityEquivalent,
                shareEquivalent,
            }),
        );
    }
})()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (browser) await browser.close();
    });
