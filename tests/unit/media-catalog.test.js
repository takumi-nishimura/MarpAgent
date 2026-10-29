const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const {
    buildMediaCatalog,
    searchMediaCatalog,
    renderMediaCatalogHtml,
} = require("../../src/media-catalog");

function fixture(t) {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-catalog-"));
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
    const write = (name, value) => {
        const file = path.join(repoRoot, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, value);
        return file;
    };
    return { repoRoot, write };
}

test("catalog relates local, shared, aliases and identical files to source pages", (t) => {
    const f = fixture(t);
    const svg =
        '<svg viewBox="0 0 120 80"><rect width="120" height="80"/></svg>';
    f.write("assets/img/shared.svg", svg);
    f.write("decks/owner/assets/img/図 a.svg", svg);
    f.write("decks/owner/slide.md", "# Owner\n");
    f.write("decks/consumer/assets/img/copy.svg", svg);
    f.write(
        "decks/consumer/slide.md",
        [
            "---",
            "marp: true",
            "paginate: true",
            "---",
            "# Public",
            "",
            "![測定装置](assets/img/from-owner.svg)",
            "",
            "---",
            "<!-- _hide: true -->",
            "# Draft",
            "",
            '<img src="shared/img/shared.svg">',
            "",
        ].join("\n"),
    );
    fs.symlinkSync(
        "../../../owner/assets/img/図 a.svg",
        path.join(f.repoRoot, "decks/consumer/assets/img/from-owner.svg"),
    );
    fs.symlinkSync(
        "../../assets",
        path.join(f.repoRoot, "decks/consumer/shared"),
    );
    const before = fs.readdirSync(f.repoRoot);
    const catalog = buildMediaCatalog({ repoRoot: f.repoRoot });
    const image = catalog.assets.find((asset) =>
        asset.path.endsWith("from-owner.svg"),
    );
    assert.ok(image);
    assert.equal(image.realPath, "decks/owner/assets/img/図 a.svg");
    assert.ok(image.aliases.includes("decks/owner/assets/img/図 a.svg"));
    assert.ok(image.identical.includes("decks/consumer/assets/img/copy.svg"));
    assert.equal(image.location.deck, "decks/owner");
    assert.equal(image.references[0].origin.line, 7);
    assert.equal(image.references[0].origin.page, 1);
    assert.equal(image.dimensions.width, 120);
    const shared = catalog.assets.find(
        (asset) => asset.path === "decks/consumer/shared/img/shared.svg",
    );
    assert.equal(shared.references[0].origin.hidden, true);
    assert.equal(shared.references[0].origin.page, null);
    assert.deepEqual(fs.readdirSync(f.repoRoot), before);
    assert.equal(searchMediaCatalog(catalog, "測定装置").assets.length, 1);
    assert.equal(
        searchMediaCatalog(catalog, "", { type: "image" }).assets.length,
        catalog.assets.length,
    );
    const consumers = searchMediaCatalog(catalog, "", {
        uses: "decks/owner/assets/img/図 a.svg",
    });
    assert.ok(
        consumers.assets.some((asset) => asset.path.endsWith("from-owner.svg")),
    );
    assert.equal(
        consumers.assets.flatMap((asset) => asset.references).length,
        1,
    );
});

test("default catalog excludes private, ignored, and symlinked private metadata", (t) => {
    const f = fixture(t);
    execFileSync("git", ["init", "--quiet", f.repoRoot]);
    f.write(".gitignore", "assets/ignored/\n");
    const secret = "DO-NOT-OUTPUT-THIS-CAPTION";
    f.write("assets/private/secret.svg", '<svg width="10" height="20"/>');
    f.write("assets/ignored/ignored.svg", '<svg width="10" height="20"/>');
    f.write("assets/public.svg", '<svg width="10" height="20"/>');
    f.write(
        "decks/demo/assets/img/public.svg",
        '<svg width="10" height="20"/>',
    );
    fs.symlinkSync(
        "../../../../assets/private/secret.svg",
        path.join(f.repoRoot, "decks/demo/assets/img/innocent.svg"),
    );
    f.write(
        "decks/demo/slide.md",
        `# Demo\n![public](assets/img/public.svg)\n![${secret}](assets/img/innocent.svg)\n![](../../assets/ignored/ignored.svg)\n`,
    );
    f.write("decks/private-draft/private/paper.md", `![](${secret}.png)`);
    const catalog = buildMediaCatalog({ repoRoot: f.repoRoot });
    const serialized = JSON.stringify(catalog);
    assert.doesNotMatch(
        serialized,
        /secret\.svg|ignored\.svg|innocent\.svg|DO-NOT-OUTPUT/,
    );
    assert.ok(catalog.excluded.private > 0);
    assert.ok(
        catalog.assets.every((asset) =>
            asset.references.every((ref) => ref.origin.context === ""),
        ),
    );
    const explicit = buildMediaCatalog({
        repoRoot: f.repoRoot,
        includePrivate: true,
    });
    assert.match(JSON.stringify(explicit), /secret\.svg/);
    assert.match(JSON.stringify(explicit), /DO-NOT-OUTPUT/);
});

test("catalog never hashes external paths and keeps repair diagnostics local", (t) => {
    const f = fixture(t);
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "media-outside-"));
    t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
    fs.writeFileSync(
        path.join(outside, "private-name.svg"),
        "outside-private-content",
    );
    f.write(
        "decks/demo/slide.md",
        "![x](assets/img/outside.svg)\n![](assets/img/missing.svg)\n",
    );
    fs.mkdirSync(path.join(f.repoRoot, "decks/demo/assets/img"), {
        recursive: true,
    });
    fs.symlinkSync(
        path.join(outside, "private-name.svg"),
        path.join(f.repoRoot, "decks/demo/assets/img/outside.svg"),
    );
    const catalog = buildMediaCatalog({ repoRoot: f.repoRoot });
    const external = catalog.assets.find((asset) =>
        asset.path.endsWith("outside.svg"),
    );
    assert.equal(external.hash, null);
    assert.equal(external.realPath, null);
    assert.ok(
        external.diagnostics.some((item) => item.code === "outside-repo"),
    );
    assert.doesNotMatch(
        JSON.stringify(catalog),
        /outside-private-content|private-name/,
    );
    assert.equal(
        catalog.assets.find((asset) => asset.path.endsWith("missing.svg"))
            .references[0].origin.line,
        2,
    );
});

test("HTML preview escapes source context and provides local media links", (t) => {
    const f = fixture(t);
    f.write("assets/image.svg", '<svg width="10" height="20"/>');
    f.write(
        "decks/demo/slide.md",
        "![<script>alert(1)</script>](../../assets/image.svg)\n",
    );
    const catalog = buildMediaCatalog({ repoRoot: f.repoRoot });
    const html = renderMediaCatalogHtml(catalog);
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /file:\/\//);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
});

test("Git symlink placeholders are diagnosed without hashing their text as media", (t) => {
    const f = fixture(t);
    execFileSync("git", ["init", "--quiet", f.repoRoot]);
    f.write("assets/link.svg", "elsewhere.svg");
    const hash = execFileSync(
        "git",
        ["-C", f.repoRoot, "hash-object", "-w", "--stdin"],
        { input: "elsewhere.svg", encoding: "utf8" },
    ).trim();
    execFileSync("git", [
        "-C",
        f.repoRoot,
        "update-index",
        "--add",
        "--cacheinfo",
        `120000,${hash},assets/link.svg`,
    ]);
    const catalog = buildMediaCatalog({ repoRoot: f.repoRoot });
    const asset = catalog.assets.find(
        (entry) => entry.path === "assets/link.svg",
    );
    assert.ok(
        asset.diagnostics.some((item) => item.code === "symlink-checkout"),
    );
    assert.equal(asset.hash, null);
});

test("visible-only output still redacts context from adjacent hidden private references", (t) => {
    const f = fixture(t);
    f.write("assets/background.svg", '<svg width="10" height="20"/>');
    f.write("assets/private/hidden.svg", '<svg width="10" height="20"/>');
    f.write(
        "decks/demo/slide.md",
        "---\nmarp: true\nstyle: |\n  section { background: url(../../assets/background.svg); }\n---\n<!-- _hide: true -->![HIDDEN-SECRET](../../assets/private/hidden.svg)\n",
    );
    const catalog = buildMediaCatalog({
        repoRoot: f.repoRoot,
        includeHidden: false,
    });
    assert.doesNotMatch(
        JSON.stringify(catalog),
        /HIDDEN-SECRET|private\/hidden/,
    );
    assert.equal(
        catalog.assets.find((entry) => entry.path === "assets/background.svg")
            .references[0].origin.context,
        "",
    );
});

test("public CSS selectors do not erase searchable captions", (t) => {
    const f = fixture(t);
    f.write("assets/figure.svg", '<svg width="10" height="20"/>');
    f.write(
        "decks/demo/slide.md",
        "---\nmarp: true\nstyle: |\n  .body { background: url(../../assets/figure.svg); }\n---\n# Public\n![Measurement caption](../../assets/figure.svg)\n",
    );
    const catalog = buildMediaCatalog({ repoRoot: f.repoRoot });
    assert.equal(
        searchMediaCatalog(catalog, "Measurement caption").assets.length,
        1,
    );
});

test("unsupported asset formats remain listable and kind filters distinguish them", (t) => {
    const f = fixture(t);
    f.write("assets/print-figure.eps", "%!PS-Adobe-3.0 EPSF-3.0");
    f.write("assets/clip.mp4", "video fixture");
    f.write("assets/figure.svg", '<svg width="10" height="20"/>');
    const catalog = buildMediaCatalog({ repoRoot: f.repoRoot });
    assert.equal(catalog.assets.length, 3);
    assert.deepEqual(
        searchMediaCatalog(catalog, "", { type: "video" }).assets.map(
            (asset) => asset.path,
        ),
        ["assets/clip.mp4"],
    );
    assert.deepEqual(
        searchMediaCatalog(catalog, "", { type: "image" }).assets.map(
            (asset) => asset.path,
        ),
        ["assets/figure.svg"],
    );
    const eps = searchMediaCatalog(catalog, "", { type: "eps" }).assets[0];
    assert.equal(eps.kind, "other");
    assert.match(eps.hash, /^[a-f0-9]{64}$/);
    assert.ok(eps.dimensions.reason);
});

test("top-level assets/decks directory symlinks never enumerate external names", (t) => {
    const f = fixture(t);
    const outside = fs.mkdtempSync(
        path.join(os.tmpdir(), "media-external-tree-"),
    );
    t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
    fs.writeFileSync(
        path.join(outside, "unpublished-study-name.svg"),
        "UNPUBLISHED-CONTENT",
    );
    fs.writeFileSync(path.join(outside, "slide.md"), "UNPUBLISHED-CAPTION");
    fs.symlinkSync(outside, path.join(f.repoRoot, "assets"));
    fs.symlinkSync(outside, path.join(f.repoRoot, "decks"));
    const catalog = buildMediaCatalog({ repoRoot: f.repoRoot });
    assert.doesNotMatch(
        JSON.stringify(catalog),
        /unpublished-study-name|UNPUBLISHED/,
    );
    assert.ok(catalog.assets.every((asset) => asset.hash === null));
    assert.ok(
        catalog.assets.some((asset) =>
            asset.diagnostics.some((item) => item.code === "outside-repo"),
        ),
    );
});
