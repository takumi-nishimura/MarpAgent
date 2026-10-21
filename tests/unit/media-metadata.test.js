const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { mediaKind, readMediaMetadata } = require("../../src/media-metadata");

function fixture(t, name, contents) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "media-metadata-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const file = path.join(dir, name);
    fs.writeFileSync(file, contents);
    return file;
}

test("PNG metadata includes independent dimensions, size and SHA256", (t) => {
    const bytes = Buffer.alloc(32);
    Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").copy(bytes);
    bytes.writeUInt32BE(640, 16);
    bytes.writeUInt32BE(480, 20);
    const file = fixture(t, "図 with space.PNG", bytes);
    const result = readMediaMetadata(file, {
        expectedStat: fs.lstatSync(file),
    });
    assert.equal(mediaKind(file), "image");
    assert.equal(result.bytes, 32);
    assert.equal(
        result.hash,
        crypto.createHash("sha256").update(bytes).digest("hex"),
    );
    assert.deepEqual(
        [result.dimensions.width, result.dimensions.height],
        [640, 480],
    );
    assert.equal(result.metadataError, null);
});

test("SVG viewBox dimensions never execute external entities", (t) => {
    const file = fixture(
        t,
        "figure.svg",
        '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg viewBox="0 0 120 80">&x;</svg>',
    );
    const result = readMediaMetadata(file);
    assert.deepEqual(
        [result.dimensions.width, result.dimensions.height],
        [120, 80],
    );
    assert.equal(result.metadataError, null);
});

test("unsupported and malformed files give a dimension reason without losing the hash", (t) => {
    for (const [name, contents] of [
        ["clip.mp4", "video"],
        ["bad.png", "not a png"],
    ]) {
        const result = readMediaMetadata(fixture(t, name, contents));
        assert.equal(result.dimensions.width, null);
        assert.equal(typeof result.dimensions.reason, "string");
        assert.match(result.hash, /^[a-f0-9]{64}$/);
    }
});

test("expected identity mismatch and symlinks are refused before hashing", (t) => {
    const file = fixture(t, "a.svg", '<svg width="10" height="20"/>');
    const stats = fs.lstatSync(file);
    const mismatch = readMediaMetadata(file, {
        expectedStat: { ...stats, ino: stats.ino + 1 },
    });
    assert.equal(mismatch.hash, null);
    assert.match(mismatch.metadataError, /changed|identity/i);
    const link = `${file}.link`;
    fs.symlinkSync("a.svg", link);
    const result = readMediaMetadata(link);
    assert.equal(result.hash, null);
    assert.ok(result.metadataError);
});

test("JPEG SOF and GIF dimensions are read without decoding pixels", (t) => {
    const jpeg = Buffer.from("ffd8ffc000080801e0028001ffd9", "hex");
    const gif = Buffer.from("4749463839614001f000", "hex");
    for (const [name, bytes, expected] of [
        ["a.jpg", jpeg, [640, 480]],
        ["a.gif", gif, [320, 240]],
    ]) {
        const result = readMediaMetadata(fixture(t, name, bytes));
        assert.deepEqual(
            [result.dimensions.width, result.dimensions.height],
            expected,
        );
    }
});
