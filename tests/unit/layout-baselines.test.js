const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "../..");
const manifest = require("../../fixtures/layout-baselines/cases.json");
const source = fs.readFileSync(path.join(root, manifest.deck), "utf8");
const slides = source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .trim()
    .split(/\n---\n/);

test("baseline IDs, pages and local assets stay resolvable", () => {
    const ids = manifest.pairs.flatMap((pair) => [
        pair.standard,
        pair.boundary,
    ]);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(slides.length, ids.length);
    for (const pair of manifest.pairs) {
        for (const [index, id] of [pair.standard, pair.boundary].entries()) {
            assert.ok(
                slides[pair.slides[index] - 1].includes(`<!-- case: ${id} -->`),
            );
        }
        assert.ok(pair.sources.length > 0);
        for (const key of pair.sources) {
            assert.match(
                manifest.sources[key].permalink,
                /\/blob\/[a-f0-9]{40}\//,
            );
            assert.match(manifest.sources[key].blobSha, /^[a-f0-9]{40}$/);
            assert.ok(manifest.sources[key].verification);
        }
        assert.ok(pair.structureReferences.length > 0);
        for (const reference of pair.structureReferences) {
            assert.ok(pair.sources.includes(reference.source), pair.id);
            assert.ok(reference.slide >= 1);
            assert.ok(
                reference.lines[0] >= 1 &&
                    reference.lines[1] >= reference.lines[0],
            );
            assert.ok(reference.observed && reference.adaptation);
        }
    }
    for (const match of source.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)) {
        assert.ok(
            fs.existsSync(
                path.resolve(
                    path.dirname(path.join(root, manifest.deck)),
                    match[1],
                ),
            ),
        );
        assert.match(match[0], /alt="[^"]+"/);
    }
    for (const control of manifest.controls) {
        assert.ok(fs.existsSync(path.join(root, control.deck)));
    }
});

test("each boundary changes one declared source condition and preserves the rest", () => {
    const mutations = {
        heading: /^## .+$/m,
        caption: /<figcaption>[^\n]*<\/figcaption>/,
        image: /src="[^"]+"/g,
        footnote: /<div class="footnote">[^\n]*<\/div>/,
        "table-row": /^\| 参照の保存 \|[^\n]*\n/m,
        "diagram-label": /B\[[^\n]*?\]/,
    };
    const clean = (slide) => slide.replace(/<!-- case: [^>]+ -->/, "").trim();
    for (const pair of manifest.pairs) {
        const [standard, boundary] = pair.slides.map((number) =>
            clean(slides[number - 1]),
        );
        const pattern = mutations[pair.mutation];
        assert.ok(pattern, pair.id);
        assert.notEqual(standard, boundary, pair.id);
        if (pair.mutation === "image") {
            const a = [...standard.matchAll(pattern)].map((match) => match[0]);
            const b = [...boundary.matchAll(pattern)].map((match) => match[0]);
            assert.equal(a.length, b.length, pair.id);
            assert.equal(
                a.filter((value, i) => value !== b[i]).length,
                1,
                pair.id,
            );
        } else if (pair.mutation !== "table-row") {
            assert.ok(pattern.test(standard), pair.id);
            assert.ok(pattern.test(boundary), pair.id);
        }
        assert.equal(
            standard.replace(pattern, ""),
            boundary.replace(pattern, ""),
            pair.id,
        );
    }
});

test("the comparison table reuses the canonical template body", () => {
    const template = fs.readFileSync(
        path.join(root, "template/layouts.md"),
        "utf8",
    );
    const first = template
        .replace(/^---\n[\s\S]*?\n---\n/, "")
        .split(/\n---\n/)[0]
        .trim();
    assert.equal(slides[10].replace(/<!-- case: [^>]+ -->/, "").trim(), first);
});

test("archived baseline retains its inputs, verified font observations and complete PNGs", () => {
    const base = path.join(root, "fixtures/layout-baselines/baseline");
    const conditions = JSON.parse(
        fs.readFileSync(path.join(base, "conditions.json"), "utf8"),
    );
    const sha256 = (file) =>
        crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    assert.equal(
        sha256(path.join(base, "slide.md.txt")),
        conditions.hashes[manifest.deck],
    );
    for (const theme of manifest.themes) {
        assert.equal(
            sha256(path.join(base, "themes", `${theme}.css`)),
            conditions.hashes[`themes/${theme}.css`],
        );
        const observations = JSON.parse(
            fs.readFileSync(
                path.join(base, theme, "observations.json"),
                "utf8",
            ),
        );
        assert.equal(observations.theme, theme);
        assert.equal(observations.audits.length, manifest.pairs.length * 2);
        for (const fonts of [
            observations.headingFonts,
            observations.bodyFonts,
        ]) {
            assert.ok(
                fonts.some(
                    (font) =>
                        font.familyName === "Noto Sans JP" &&
                        font.glyphCount > 0,
                ),
            );
        }
        for (const file of [
            ...observations.screenshots,
            ...observations.trials.map((trial) => trial.screenshot),
        ]) {
            const png = fs.readFileSync(path.join(base, theme, file));
            assert.equal(
                png.subarray(0, 8).toString("hex"),
                "89504e470d0a1a0a",
            );
            assert.equal(png.readUInt32BE(16), 1280);
            assert.equal(png.readUInt32BE(20), 720);
        }
    }
});
