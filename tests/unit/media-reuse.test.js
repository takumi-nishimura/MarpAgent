const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { planMediaReuse, reuseMediaAsset } = require("../../src/media-reuse");

function fixture(t) {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-reuse-"));
    t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
    for (const deck of ["source", "consumer"]) {
        fs.mkdirSync(path.join(repoRoot, "decks", deck), { recursive: true });
        fs.writeFileSync(
            path.join(repoRoot, "decks", deck, "slide.md"),
            "# Deck\n",
        );
    }
    const source = "decks/source/assets/img/図 a.svg";
    fs.mkdirSync(path.dirname(path.join(repoRoot, source)), {
        recursive: true,
    });
    fs.writeFileSync(
        path.join(repoRoot, source),
        '<svg width="100" height="50"/>',
    );
    return {
        repoRoot,
        source,
        destination: "decks/consumer/assets/img/from-source.svg",
    };
}

test("dry-run describes a relative file link without creating directories", (t) => {
    const f = fixture(t);
    const plan = planMediaReuse(f);
    assert.equal(plan.target, "../../../source/assets/img/図 a.svg");
    assert.equal(plan.reference, "assets/img/from-source.svg");
    const result = reuseMediaAsset(plan, { dryRun: true });
    assert.equal(result.created, false);
    assert.equal(
        fs.existsSync(path.join(f.repoRoot, "decks/consumer/assets")),
        false,
    );
});

test("explicit reuse creates only the named relative file symlink", (t) => {
    const f = fixture(t);
    const plan = planMediaReuse(f);
    const result = reuseMediaAsset(plan);
    const destination = path.join(f.repoRoot, f.destination);
    assert.equal(result.created, true);
    assert.equal(fs.readlinkSync(destination), plan.target);
    assert.equal(
        fs.realpathSync.native(destination),
        path.join(f.repoRoot, f.source),
    );
    assert.match(
        fs.readFileSync(path.join(f.repoRoot, f.source), "utf8"),
        /width="100"/,
    );
    assert.throws(() => reuseMediaAsset(plan), /exists|overwrite/i);
});

test("existing dangling symlinks, private sources and directory sources are refused", (t) => {
    const f = fixture(t);
    fs.mkdirSync(path.dirname(path.join(f.repoRoot, f.destination)), {
        recursive: true,
    });
    fs.symlinkSync("missing.svg", path.join(f.repoRoot, f.destination));
    assert.throws(() => planMediaReuse(f), /exists|overwrite/i);
    const another = {
        ...f,
        destination: "decks/consumer/assets/img/another.svg",
    };
    assert.throws(
        () => planMediaReuse({ ...another, source: "decks/source/assets/img" }),
        /known|file/i,
    );
    fs.mkdirSync(path.join(f.repoRoot, "assets/private"), { recursive: true });
    fs.writeFileSync(
        path.join(f.repoRoot, "assets/private/secret.svg"),
        '<svg width="1" height="1"/>',
    );
    assert.throws(
        () =>
            planMediaReuse({ ...another, source: "assets/private/secret.svg" }),
        /known|private/i,
    );
});

test("destination parent symlinks and external destinations are rejected before writes", (t) => {
    const f = fixture(t);
    fs.mkdirSync(path.join(f.repoRoot, "decks/consumer/assets"));
    fs.symlinkSync(
        "../../source/assets/img",
        path.join(f.repoRoot, "decks/consumer/assets/img"),
    );
    assert.throws(() => planMediaReuse(f), /parent.*symlink|symlink.*parent/i);
    assert.throws(
        () => planMediaReuse({ ...f, destination: "../escape.svg" }),
        /inside|repository/i,
    );
    assert.throws(
        () => planMediaReuse({ ...f, destination: "decks/consumer/other.svg" }),
        /assets/i,
    );
    assert.equal(
        fs.readdirSync(path.join(f.repoRoot, "decks/source/assets/img")).length,
        1,
    );
});

test("source replacement after planning and unavailable symlinks do not create a copy", (t) => {
    const f = fixture(t);
    const plan = planMediaReuse(f);
    fs.unlinkSync(path.join(f.repoRoot, f.source));
    fs.writeFileSync(path.join(f.repoRoot, f.source), "replacement");
    assert.throws(() => reuseMediaAsset(plan), /changed|replacement/i);
    const fresh = planMediaReuse(f);
    const result = () =>
        reuseMediaAsset(fresh, {
            createSymlink() {
                const error = new Error("Windows privilege");
                error.code = "EPERM";
                throw error;
            },
        });
    assert.throws(result, /symlink.*unavailable|symlink.*privilege/i);
    assert.equal(fs.existsSync(path.join(f.repoRoot, f.destination)), false);
    assert.equal(
        fs.existsSync(path.join(f.repoRoot, "decks/consumer/assets")),
        false,
    );
});

test("a safe named file alias can be reused without choosing another owner", (t) => {
    const f = fixture(t);
    const img = path.join(f.repoRoot, "decks/consumer/assets/img");
    fs.mkdirSync(img, { recursive: true });
    fs.symlinkSync(
        "../../../source/assets/img/図 a.svg",
        path.join(img, "existing.svg"),
    );
    const plan = planMediaReuse({
        ...f,
        source: "decks/consumer/assets/img/existing.svg",
        destination: "decks/consumer/assets/img/流用 図.svg",
    });
    assert.equal(plan.target, "existing.svg");
    assert.equal(plan.sourceRealPath, f.source);
    assert.equal(
        plan.reference,
        "assets/img/%E6%B5%81%E7%94%A8%20%E5%9B%B3.svg",
    );
    reuseMediaAsset(plan);
    assert.equal(
        fs.realpathSync.native(path.join(img, "流用 図.svg")),
        path.join(f.repoRoot, f.source),
    );
});
