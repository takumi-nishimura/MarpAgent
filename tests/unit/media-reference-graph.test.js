const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
    collectDeckReferences,
    inspectAssetPath,
    isPathInside,
    resolveAssetReference,
} = require("../../src/media-reference-graph");
const { findMissingAssets } = require("../../src/media-assets");

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "media-graph-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const repoRoot = path.join(root, "repo");
    const deckDir = path.join(repoRoot, "decks", "consumer");
    fs.mkdirSync(path.join(deckDir, "assets", "img"), { recursive: true });
    const write = (name, content = "image") => {
        const file = path.join(repoRoot, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
        return file;
    };
    return { root, repoRoot, deckDir, write, policy: "bundle" };
}

test("containment uses path components and follows a symlinked repo root", (t) => {
    const f = fixture(t);
    assert.equal(isPathInside(f.repoRoot, `${f.repoRoot}-other/a.png`), false);
    assert.equal(
        isPathInside(f.repoRoot, path.join(f.repoRoot, "a.png")),
        true,
    );
    const image = f.write("assets/図 with space.png");
    const alias = path.join(f.root, "repo-alias");
    fs.symlinkSync("repo", alias);
    const result = resolveAssetReference(
        "../../assets/%E5%9B%B3%20with%20space.png?v=2#x",
        {
            ...f,
            repoRoot: alias,
            deckDir: path.join(alias, "decks", "consumer"),
        },
    );
    assert.equal(result.realPath, image);
    assert.equal(result.insideRepo, true);
    assert.equal(result.allowed, true);
});

test("bundle accepts shared and relative file reuse without choosing ownership", (t) => {
    const f = fixture(t);
    const image = f.write("decks/owner/assets/img/original.png");
    f.write("assets/logos/logo.svg");
    fs.symlinkSync("../../assets", path.join(f.deckDir, "shared"));
    fs.symlinkSync(
        "../../../owner/assets/img/original.png",
        path.join(f.deckDir, "assets/img/reused.png"),
    );
    for (const reference of [
        "shared/logos/logo.svg",
        "assets/img/reused.png",
    ]) {
        const result = resolveAssetReference(reference, f);
        assert.equal(result.allowed, true, JSON.stringify(result));
        assert.equal(result.symlinks.length, 1);
    }
    assert.equal(
        resolveAssetReference("assets/img/reused.png", f).realPath,
        image,
    );
});

test("bundle diagnoses absolute links, cross-deck directories, and escapes via a parent", (t) => {
    const f = fixture(t);
    const image = f.write("decks/owner/assets/img/original.png");
    fs.symlinkSync(image, path.join(f.deckDir, "assets/img/absolute.png"));
    fs.symlinkSync(
        "../../../owner/assets/img",
        path.join(f.deckDir, "assets/img/whole"),
    );
    fs.mkdirSync(path.join(f.root, "outside"));
    fs.writeFileSync(path.join(f.root, "outside", "secret.png"), "private");
    fs.symlinkSync(
        "../../../../outside",
        path.join(f.deckDir, "assets", "escaped"),
    );
    for (const [reference, code] of [
        ["assets/img/absolute.png", "absolute-symlink"],
        ["assets/img/whole/original.png", "directory-reuse"],
        ["assets/escaped/secret.png", "outside-repo"],
        ["../owner/assets/img/original.png", "cross-deck-reference"],
    ]) {
        const strict = resolveAssetReference(reference, f);
        assert.equal(strict.allowed, false);
        assert.ok(
            strict.diagnostics.some((item) => item.code === code),
            JSON.stringify(strict),
        );
        assert.equal(
            resolveAssetReference(reference, { ...f, policy: "permissive" })
                .allowed,
            true,
        );
    }
    const deckPath = f.write(
        "decks/consumer/slide.md",
        "![](assets/escaped/secret.png)\n",
    );
    assert.deepEqual(findMissingAssets(deckPath), []);
});

test("cycles and broken parent links identify the link requiring repair", (t) => {
    const f = fixture(t);
    const broken = path.join(f.deckDir, "assets/img/broken");
    fs.symlinkSync("missing", broken);
    const cycle = path.join(f.deckDir, "assets/img/cycle");
    fs.symlinkSync("cycle", cycle);
    for (const [file, code, link] of [
        [path.join(broken, "figure.png"), "broken-symlink", broken],
        [cycle, "symlink-cycle", cycle],
        [path.join(f.deckDir, "absent.png"), "missing", null],
    ]) {
        const result = inspectAssetPath(file, f);
        assert.equal(result.allowed, false);
        assert.equal(result.exists, false);
        const diagnosis = result.diagnostics.find((item) => item.code === code);
        assert.ok(diagnosis, JSON.stringify(result));
        if (link) assert.equal(diagnosis.link, link);
    }
});

test("reference origins retain source lines, hidden pages, and frontmatter scope", (t) => {
    const f = fixture(t);
    const markdown = [
        "---",
        "marp: true",
        "paginate: true",
        "style: |",
        "  section { background: url(shared/bg.png); }",
        "---",
        "# Public",
        "",
        "![Caption][figure]",
        "",
        "---",
        "<!-- _hide: true -->",
        "# Draft",
        "",
        '<img src="assets/img/draft.png">',
        "",
        "---",
        "# Public 2",
        "",
        "[figure]: assets/img/図%20a.png",
        "",
    ].join("\n");
    const deckPath = f.write("decks/consumer/slide.md", markdown);
    const references = collectDeckReferences(deckPath, markdown, f);
    assert.equal(references.length, 3);
    const [global, visible, hidden] = references;
    assert.equal(global.origin.scope, "frontmatter");
    assert.equal(global.origin.line, 5);
    assert.equal(global.origin.slide, null);
    assert.equal(global.origin.page, null);
    assert.deepEqual(
        [
            visible.origin.line,
            visible.origin.slide,
            visible.origin.renderedSlide,
            visible.origin.page,
            visible.origin.hidden,
        ],
        [9, 1, 1, 1, false],
    );
    assert.deepEqual(
        [
            hidden.origin.line,
            hidden.origin.slide,
            hidden.origin.renderedSlide,
            hidden.origin.page,
            hidden.origin.hidden,
        ],
        [15, 2, null, null, true],
    );
    assert.ok(visible.origin.context.includes("Caption"));
    assert.equal(visible.origin.file, deckPath);
    assert.equal(
        collectDeckReferences(deckPath, markdown, {
            ...f,
            includeHidden: false,
        }).length,
        2,
    );
});

test("nonlocal references stay inspectable and never become copy candidates", (t) => {
    const f = fixture(t);
    for (const [reference, kind] of [
        ["https://example.org/a.png", "remote"],
        ["//example.org/a.png", "remote"],
        ["data:image/png;base64,AAAA", "data"],
        ["#figure", "fragment"],
        ["blob:unavailable", "unsupported"],
    ]) {
        const result = resolveAssetReference(reference, f);
        assert.equal(result.kind, kind);
        assert.equal(result.path, null);
        assert.equal(result.allowed, false);
    }
});

test("missing files below a valid shared link are missing rather than broken links", (t) => {
    const f = fixture(t);
    f.write("assets/present.png");
    fs.symlinkSync("../../assets", path.join(f.deckDir, "shared"));
    const result = resolveAssetReference("shared/absent.png", f);
    assert.equal(result.status, "missing");
    assert.deepEqual(
        result.diagnostics.map((item) => item.code),
        ["missing"],
    );
});

test("CSS origin lines refer to the URL-bearing source line", (t) => {
    const f = fixture(t);
    const markdown =
        "# CSS\n\n<style scoped>\na{--x:url(a.png);}\n</style>\n\n<!--\n_backgroundImage: url(b.png)\n-->\n";
    const deckPath = f.write("decks/consumer/slide.md", markdown);
    const references = collectDeckReferences(deckPath, markdown, f);
    assert.deepEqual(
        references.map((item) => item.origin.line),
        [4, 8],
    );
});

test("symlink target dot segments resolve after intermediate links", (t) => {
    const f = fixture(t);
    f.write("decks/consumer/assets/img/same.png", "public");
    fs.mkdirSync(path.join(f.root, "outside/deeper"), { recursive: true });
    const outside = path.join(f.root, "outside/same.png");
    fs.writeFileSync(outside, "private");
    const img = path.join(f.deckDir, "assets/img");
    fs.symlinkSync("../../../../../outside/deeper", path.join(img, "branch"));
    fs.symlinkSync("branch/../same.png", path.join(img, "ambiguous.png"));
    const result = resolveAssetReference("assets/img/ambiguous.png", f);
    assert.equal(
        fs.realpathSync.native(path.join(img, "ambiguous.png")),
        outside,
    );
    assert.equal(result.realPath, outside);
    assert.equal(result.allowed, false);
    assert.ok(result.diagnostics.some((item) => item.code === "outside-repo"));
});
