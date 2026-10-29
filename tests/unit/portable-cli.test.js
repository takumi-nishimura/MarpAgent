const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
function run(args) {
    return spawnSync(
        process.execPath,
        [path.join(root, "bin/marpx.js"), ...args],
        { cwd: root, encoding: "utf8", timeout: 30000 },
    );
}

test("ZIP-only flags reject other modes and ZIP limits validate before rendering", () => {
    for (const option of [
        ["--strict-offline"],
        ["--bundle-root", "."],
        ["--bundle-root="],
        ["--max-bundle-files", "2"],
        ["--max-bundle-bytes", "128"],
    ]) {
        const result = run(["fixtures/clean-slide.md", "--html", ...option]);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /can only be used with --zip/);
    }
    for (const value of ["0", "-1", "1.5", "oops", "9007199254740992"]) {
        const result = run([
            "fixtures/clean-slide.md",
            "--zip",
            `--max-bundle-files=${value}`,
        ]);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /positive safe integer/);
    }
    assert.match(run(["--zip"]).stderr, /exactly one file path required/);
    assert.match(
        run(["--zip", "--bundle-root="]).stderr,
        /requires a directory path/,
    );
    assert.match(
        run(["fixtures/clean-slide.md", "--zip", "--autofix"]).stderr,
        /--autofix can only be used with/,
    );
});

test("ZIP dry-run lists missing/remote resources, exits unsuccessfully, and creates no output", (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-cli-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const deck = path.join(dir, "slide.md");
    fs.writeFileSync(
        deck,
        '---\nmarp: true\n---\n# Visible\n\n<img src="missing.png">\n<img src="https://example.invalid/remote.png">\n',
    );
    const output = path.join(dir, "out.zip");
    const result = run([
        deck,
        "--zip",
        "--bundle-root",
        dir,
        "--dry-run",
        "--strict-offline",
        "--output",
        output,
    ]);
    assert.equal(result.status, 1, result.stderr);
    const manifest = JSON.parse(result.stdout);
    assert.equal(manifest.remoteDependencies.length, 1);
    assert.ok(manifest.errors.some((e) => e.code === "MISSING_RESOURCE"));
    assert.ok(manifest.errors.some((e) => e.code === "OFFLINE_DEPENDENCY"));
    assert.equal(fs.existsSync(output), false);
});

test("ZIP success, overwrite routing, and strict-offline failure preserve existing archives", (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-cli-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const deck = path.join(dir, "slide.md");
    fs.writeFileSync(deck, "---\nmarp: true\n---\n# Local only\n");
    const output = path.join(dir, "bundle.zip");
    const args = [deck, "--zip", "--bundle-root", dir, "--output", output];
    const first = run([...args, "--strict-offline"]);
    assert.equal(first.status, 0, first.stderr);
    const original = fs.readFileSync(output);
    assert.equal(run(args).status, 1);
    assert.deepEqual(fs.readFileSync(output), original);
    fs.writeFileSync(
        deck,
        '---\nmarp: true\n---\n# Remote\n\n<img src="https://example.invalid/resource.png">\n',
    );
    const refused = run([...args, "--force", "--strict-offline"]);
    assert.equal(refused.status, 1);
    assert.deepEqual(fs.readFileSync(output), original);
    assert.equal(run([...args, "--force"]).status, 0);
    assert.notDeepEqual(fs.readFileSync(output), original);
});
