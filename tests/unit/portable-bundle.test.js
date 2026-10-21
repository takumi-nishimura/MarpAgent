const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { unzipSync } = require("fflate");
const {
    planPortableBundle,
    writePortableBundle,
} = require("../../src/portable-bundle");

function fixture(t, files = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "marp-bundle-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const [name, content] of Object.entries(files)) {
        const dest = path.join(root, name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, content);
    }
    const deckPath = path.join(root, "decks/deep/talk/slide.md");
    fs.mkdirSync(path.dirname(deckPath), { recursive: true });
    fs.writeFileSync(deckPath, "# Generic fixture\n");
    return { root, deckPath };
}

function plan(f, html, options = {}) {
    return planPortableBundle({
        repoRoot: f.root,
        deckPath: f.deckPath,
        html,
        ...options,
    });
}

const hash = (data) => createHash("sha256").update(data).digest("hex");
const textOf = (p, name) =>
    p.files.find((file) => file.path === name).data.toString();

test("plans only rendered resources and rewrites CSS/SVG transitively with their own bases", (t) => {
    const f = fixture(t, {
        "decks/deep/talk/assets/photo 日本.png": "image",
        "decks/deep/talk/assets/poster.png": "poster",
        "decks/deep/talk/assets/clip.webm": "video",
        "decks/deep/talk/assets/audio.ogg": "audio",
        "decks/deep/talk/assets/other.png": "unrelated",
        "decks/deep/talk/assets/hidden.png": "hidden",
        "decks/deep/talk/brief.md": "private brief",
        "decks/deep/talk/note.txt": "private notes",
        "decks/deep/talk/.env": "private environment",
        "assets/css/theme.css":
            '@import "nested/palette.css?theme=1#x"; .x { background: url("../img/same.svg#view"); }',
        "assets/css/nested/palette.css":
            '.y { background: url("../../img/photo%20two.png?raw=1#frag"); }',
        "assets/img/photo two.png": "shared photo",
        "assets/img/same.svg":
            '<svg xmlns="http://www.w3.org/2000/svg"><image href="photo%20two.png"/><use href="#local"/></svg>',
        "decks/owner/assets/same.png": "owner image",
    });
    const deckDir = path.dirname(f.deckPath);
    fs.symlinkSync("../../../assets", path.join(deckDir, "shared"), "dir");
    fs.symlinkSync(
        "../../../owner/assets/same.png",
        path.join(deckDir, "assets/reused.png"),
    );
    const p = plan(
        f,
        `<html><head><link rel="stylesheet" href="shared/css/theme.css"></head><body>
    <section><img src="assets/photo%20%E6%97%A5%E6%9C%AC.png?x=1&amp;y=2#view">
    <video src="assets/clip.webm" poster="assets/poster.png"></video><audio><source src="assets/audio.ogg"></audio>
    <img src="assets/reused.png"><a href="https://example.org/paper">Citation</a>
    <!-- private production comment --></section><section><img src="assets/reused.png"></section>
    <div class="bespoke-marp-note" data-index="0"><img src="assets/hidden.png">private speaker note</div>
    </body></html>`,
    );
    assert.deepEqual(p.errors, []);
    assert.equal(p.manifest.remoteDependencies.length, 0);
    const sources = p.manifest.files.map((x) => x.source).filter(Boolean);
    assert.equal(sources.length, 9);
    assert.ok(sources.includes("decks/owner/assets/same.png"));
    assert.ok(sources.includes("assets/img/photo two.png"));
    assert.ok(!sources.some((s) => /other|hidden|brief|note|\.env/.test(s)));
    const html = textOf(p, "index.html");
    assert.match(html, /\?x=1&amp;y=2#view/);
    assert.match(html, /https:\/\/example.org\/paper/);
    assert.doesNotMatch(html, /private|bespoke-marp-note/);
    const sharedSvg = p.manifest.files.find(
        (x) => x.source === "assets/img/same.svg",
    );
    assert.match(textOf(p, sharedSvg.path), /href="#local"/);
    assert.doesNotMatch(textOf(p, sharedSvg.path), /photo%20two/);
    const reused = p.manifest.files.find(
        (x) => x.source === "decks/owner/assets/same.png",
    );
    assert.deepEqual(reused.pages, [1, 2]);
    assert.ok(
        p.manifest.references.some(
            (r) => r.reference === "shared/css/theme.css",
        ),
    );
    assert.ok(!JSON.stringify(p.manifest).includes(f.root));
});

test("lists remote dependencies without fetching and rejects them in strict offline mode", (t) => {
    const f = fixture(t);
    const html =
        '<section><style>@import "https://fonts.example/font.css";</style><img src="//cdn.example/photo.png"><a href="https://example.org/citation">Source</a><img src="data:image/png;base64,aA=="></section>';
    const p = plan(f, html);
    assert.deepEqual(p.errors, []);
    assert.deepEqual(
        p.manifest.remoteDependencies.map((r) => r.reference).sort(),
        ["//cdn.example/photo.png", "https://fonts.example/font.css"],
    );
    assert.ok(
        plan(f, html, { strictOffline: true }).errors.some(
            (e) => e.code === "OFFLINE_DEPENDENCY",
        ),
    );
});

test("parent symlinks retain the browser URL base and a symlinked bundle root remains portable", (t) => {
    const f = fixture(t, {
        "decks/neighbor.png": "logical URL base",
        "decks/deep/neighbor.png": "physical target base",
    });
    fs.symlinkSync("deep/talk", path.join(f.root, "decks/alias"), "dir");
    const p = plan(
        { ...f, deckPath: path.join(f.root, "decks/alias/slide.md") },
        '<section><img src="../neighbor.png"></section>',
    );
    assert.deepEqual(p.errors, []);
    assert.equal(
        p.manifest.files.find((file) => file.source)?.source,
        "decks/neighbor.png",
    );
    const rootAlias = f.root + "-alias";
    fs.symlinkSync(f.root, rootAlias, "dir");
    t.after(() => fs.unlinkSync(rootAlias));
    const viaRootAlias = planPortableBundle({
        html: '<section><img src="../neighbor.png"></section>',
        repoRoot: rootAlias,
        deckPath: path.join(rootAlias, "decks/alias/slide.md"),
    });
    assert.deepEqual(viaRootAlias.manifest, p.manifest);
});

test("reports missing, absolute, outside, cyclic, private, and nonregular resources without leaking local paths", (t) => {
    const f = fixture(t, {
        "decks/deep/talk/a.css": '@import "b.css";',
        "decks/deep/talk/b.css": '@import "a.css";',
        "decks/deep/talk/notes.txt": "secret",
        "decks/deep/talk/.git/config": "secret",
    });
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "marp-outside-"));
    t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
    fs.writeFileSync(path.join(outside, "secret.png"), "outside secret");
    fs.symlinkSync(
        path.join(outside, "secret.png"),
        path.join(path.dirname(f.deckPath), "escape.png"),
    );
    fs.symlinkSync(
        "cycle-b.png",
        path.join(path.dirname(f.deckPath), "cycle-a.png"),
    );
    fs.symlinkSync(
        "cycle-a.png",
        path.join(path.dirname(f.deckPath), "cycle-b.png"),
    );
    const p = plan(
        f,
        `<section><img src="missing.png"><img src="${outside}/secret.png"><img src="file://${outside}/secret.png"><img src="../../../../secret.png"><img src="escape.png"><link rel="stylesheet" href="a.css"><img src="cycle-a.png"><img src="notes.txt"><img src=".git/config"><img src="."></section>`,
    );
    const codes = p.errors.map((e) => e.code);
    for (const code of [
        "MISSING_RESOURCE",
        "ABSOLUTE_REFERENCE",
        "OUTSIDE_ROOT",
        "DEPENDENCY_CYCLE",
        "PRIVATE_RESOURCE",
        "NOT_REGULAR_FILE",
        "SYMLINK_CYCLE",
    ]) {
        assert.ok(codes.includes(code), `${code}: ${JSON.stringify(p.errors)}`);
    }
    assert.ok(p.errors.every((e) => e.from));
    assert.ok(!JSON.stringify(p.manifest).includes(outside));
    assert.ok(!JSON.stringify(p.errors).includes(outside));
    assert.ok(
        !p.files.some((file) =>
            file.data.toString().includes("outside secret"),
        ),
    );
});

test("keeps equal basenames distinct and deduplicates repeated aliases", (t) => {
    const f = fixture(t, { "a/same.png": "first", "b/same.png": "second" });
    const dir = path.dirname(f.deckPath);
    fs.symlinkSync("../../../a/same.png", path.join(dir, "first.png"));
    fs.symlinkSync("../../../a/same.png", path.join(dir, "alias.png"));
    fs.symlinkSync("../../../b/same.png", path.join(dir, "second.png"));
    const p = plan(
        f,
        '<section><img src="first.png"><img src="second.png"><img src="alias.png"></section>',
    );
    assert.deepEqual(p.errors, []);
    const images = p.manifest.files.filter((f) => f.source);
    assert.equal(images.length, 2);
    assert.equal(new Set(images.map((f) => f.path)).size, 2);
});

test("size/file limits and unreadable files fail before output", (t) => {
    const f = fixture(t, {
        "decks/deep/talk/large.png": "123456789",
        "decks/deep/talk/second.png": "x",
    });
    const html =
        '<section><img src="large.png"><img src="second.png"></section>';
    assert.ok(
        plan(f, html, { maxBytes: 8 }).errors.some(
            (e) => e.code === "BYTE_LIMIT",
        ),
    );
    assert.ok(
        plan(f, html, { maxFiles: 1 }).errors.some(
            (e) => e.code === "FILE_LIMIT",
        ),
    );
    fs.chmodSync(path.join(path.dirname(f.deckPath), "large.png"), 0);
    assert.ok(
        plan(f, html).errors.some((e) => e.code === "UNREADABLE_RESOURCE"),
    );
});

test("archive entries are regular, deterministic, and match their manifest hashes", (t) => {
    const f = fixture(t, { "decks/deep/talk/a.png": "pixels" });
    const p = plan(f, '<section><img src="a.png"></section>');
    const outputPath = path.join(f.root, "talk.zip");
    const result = writePortableBundle(p, { outputPath });
    assert.equal(result.outputPath, outputPath);
    const bytes = fs.readFileSync(outputPath);
    const entries = unzipSync(bytes);
    const manifest = JSON.parse(
        Buffer.from(entries["manifest.json"]).toString(),
    );
    for (const file of manifest.files) {
        assert.ok(entries[file.path]);
        assert.equal(entries[file.path].length, file.size);
        assert.equal(hash(entries[file.path]), file.sha256);
        assert.ok(!file.path.includes("..") && !file.path.startsWith("/"));
    }
    assert.ok(entries["README.txt"]);
    assert.ok(!entries["slide.md"]);
    // Read the central directory independently of the ZIP library's decoder.
    for (let i = 0; i < bytes.length - 46; i++) {
        if (bytes.readUInt32LE(i) !== 0x02014b50) continue;
        const mode = bytes.readUInt32LE(i + 38) >>> 16;
        assert.equal(mode & 0o170000, 0o100000);
    }
    writePortableBundle(p, { outputPath: path.join(f.root, "again.zip") });
    assert.deepEqual(bytes, fs.readFileSync(path.join(f.root, "again.zip")));
});

test("refuses overwrites and invalid plans, preserves existing output, and cleans staging on failure", (t) => {
    const f = fixture(t);
    const outputPath = path.join(f.root, "keep.zip");
    fs.writeFileSync(outputPath, "existing output");
    const p = plan(f, "<section>hello</section>");
    assert.throws(
        () => writePortableBundle(p, { outputPath }),
        /overwrite|exists/,
    );
    const invalid = plan(f, '<section><img src="absent.png"></section>');
    assert.throws(
        () => writePortableBundle(invalid, { outputPath, force: true }),
        /invalid|error|missing/i,
    );
    for (const entryPath of [
        "../escape",
        "..\\escape",
        "C:/escape",
        "/escape",
    ]) {
        const malicious = {
            ...p,
            files: [...p.files, { path: entryPath, data: Buffer.from("x") }],
        };
        assert.throws(
            () => writePortableBundle(malicious, { outputPath, force: true }),
            /entry|path/i,
        );
    }
    assert.equal(fs.readFileSync(outputPath, "utf8"), "existing output");
    assert.equal(
        fs.readdirSync(f.root).some((n) => n.startsWith(".marp-bundle-")),
        false,
    );
    assert.throws(
        () => writePortableBundle(p, { outputPath: f.deckPath, force: true }),
        /source/,
    );
    assert.equal(fs.readFileSync(f.deckPath, "utf8"), "# Generic fixture\n");
    writePortableBundle(p, { outputPath, force: true });
    assert.equal(fs.readFileSync(outputPath).readUInt32LE(), 0x04034b50);
});

test("force cannot overwrite a resource or its symlink alias", (t) => {
    const f = fixture(t, { "decks/deep/talk/photo.png": "original pixels" });
    const resource = path.join(path.dirname(f.deckPath), "photo.png");
    const alias = path.join(path.dirname(f.deckPath), "alias.png");
    fs.symlinkSync("photo.png", alias);
    const p = plan(f, '<section><img src="alias.png"></section>');
    for (const outputPath of [resource, alias]) {
        assert.throws(
            () => writePortableBundle(p, { outputPath, force: true }),
            /source/,
        );
        assert.equal(fs.readFileSync(resource, "utf8"), "original pixels");
        assert.equal(fs.lstatSync(alias).isSymbolicLink(), true);
    }
});

test("archive I/O failure preserves output and removes the staging directory", (t) => {
    const f = fixture(t);
    const outputPath = path.join(f.root, "keep.zip");
    fs.writeFileSync(outputPath, "existing ZIP");
    const p = plan(f, "<section>one</section>");
    const originalWrite = fs.writeFileSync;
    t.mock.method(fs, "writeFileSync", (file, ...args) => {
        if (path.basename(file) === "bundle.zip")
            throw Object.assign(new Error("injected write failure"), {
                code: "EIO",
            });
        return originalWrite(file, ...args);
    });
    assert.throws(() => writePortableBundle(p, { outputPath, force: true }), {
        code: "EIO",
    });
    assert.equal(fs.readFileSync(outputPath, "utf8"), "existing ZIP");
    assert.equal(
        fs.readdirSync(f.root).some((name) => name.startsWith(".marp-bundle-")),
        false,
    );
});

test("custom script dependencies are disclosed and strict offline rejects them", (t) => {
    const f = fixture(t, {
        "decks/deep/talk/app.js": 'fetch("runtime.json")',
        "decks/deep/talk/dynamic.svg":
            '<svg xmlns="http://www.w3.org/2000/svg"><script>fetch("runtime.json")</script></svg>',
    });
    const html =
        '<section><script src="app.js"></script><script>fetch("dynamic.png")</script><img src="dynamic.svg"></section>';
    const p = plan(f, html);
    assert.deepEqual(p.errors, []);
    assert.equal(
        p.manifest.unsupported.filter((x) => x.code === "DYNAMIC_SCRIPT")
            .length,
        3,
    );
    assert.ok(
        plan(f, html, { strictOffline: true }).errors.some(
            (e) => e.code === "OFFLINE_DEPENDENCY",
        ),
    );
    assert.ok(
        !p.manifest.files.some((f) => f.source?.includes("runtime.json")),
    );
});
