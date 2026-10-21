const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const cli = path.resolve(__dirname, "../../bin/marpx.js");
function fixture(t) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "assets-cli-"));
    t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
    fs.mkdirSync(path.join(repo, "decks/demo/assets/img"), { recursive: true });
    fs.writeFileSync(
        path.join(repo, "decks/demo/assets/img/図 a.svg"),
        '<svg viewBox="0 0 20 10"/>',
    );
    fs.writeFileSync(
        path.join(repo, "decks/demo/slide.md"),
        "# Slide\n![測定装置](assets/img/%E5%9B%B3%20a.svg)\n",
    );
    const run = (...args) =>
        spawnSync(process.execPath, [cli, "assets", ...args, "--repo", repo], {
            encoding: "utf8",
            timeout: 30000,
        });
    return { repo, run };
}

test("marpx assets list/search share JSON, captions, dimensions and source locations", (t) => {
    const f = fixture(t);
    const listing = f.run("list", "--format", "json");
    assert.equal(listing.status, 0, listing.stderr);
    const catalog = JSON.parse(listing.stdout);
    assert.equal(catalog.assets.length, 1);
    assert.equal(catalog.assets[0].references[0].origin.line, 2);
    assert.equal(catalog.assets[0].dimensions.width, 20);
    const search = f.run("search", "測定装置", "--format", "json");
    assert.equal(search.status, 0, search.stderr);
    assert.deepEqual(JSON.parse(search.stdout).assets, catalog.assets);
    const text = f.run("list");
    assert.equal(text.status, 0, text.stderr);
    assert.match(text.stdout, /20 × 10/);
    assert.match(text.stdout, /decks\/demo\/slide.md:2/);
});

test("preview is an explicit local temporary artifact", (t) => {
    const f = fixture(t);
    const result = f.run("list", "--preview", "--format", "json");
    assert.equal(result.status, 0, result.stderr);
    const preview = JSON.parse(result.stdout).previewPath;
    t.after(() =>
        fs.rmSync(path.dirname(preview), { recursive: true, force: true }),
    );
    assert.equal(path.isAbsolute(preview), true);
    assert.equal(preview.startsWith(`${os.tmpdir()}${path.sep}`), true);
    assert.equal(preview.startsWith(f.repo), false);
    assert.match(fs.readFileSync(preview, "utf8"), /<img/);
});

test("doctor distinguishes hidden missing references and returns a failure status", (t) => {
    const f = fixture(t);
    fs.appendFileSync(
        path.join(f.repo, "decks/demo/slide.md"),
        "\n---\n<!-- _hide: true -->\n![](assets/img/absent.svg)\n",
    );
    const result = f.run("doctor", "--format", "json");
    assert.equal(result.status, 1, result.stderr);
    const asset = JSON.parse(result.stdout).assets.find((entry) =>
        entry.path.endsWith("absent.svg"),
    );
    assert.equal(asset.references[0].origin.hidden, true);
    assert.equal(asset.references[0].origin.page, null);
    assert.equal(f.run("doctor", "--visible-only").status, 0);
});

test("reuse dry-run preserves the destination; execution refuses an existing link", (t) => {
    const f = fixture(t);
    const destination = "decks/demo/assets/img/from-source.svg";
    const args = ["reuse", "decks/demo/assets/img/図 a.svg", destination];
    const dry = f.run(...args, "--dry-run", "--format", "json");
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(JSON.parse(dry.stdout).created, false);
    assert.equal(fs.existsSync(path.join(f.repo, destination)), false);
    const write = f.run(...args);
    assert.equal(write.status, 0, write.stderr);
    assert.equal(fs.readlinkSync(path.join(f.repo, destination)), "図 a.svg");
    const refused = f.run(...args);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /overwrite|exists/);
});

test("assets rejects unsupported modes and misplaced options", (t) => {
    const f = fixture(t);
    for (const args of [
        ["list", "--dry-run"],
        ["search"],
        ["reuse", "one.svg"],
        ["reuse", "one.svg", "two.svg", "--preview"],
        ["list", "--format", "sarif"],
        ["list", "--pdf"],
        ["prune"],
        ["list", "--uses", "unknown.svg"],
    ]) {
        const result = f.run(...args);
        assert.equal(result.status, 1, `${args.join(" ")}: ${result.stdout}`);
    }
});
