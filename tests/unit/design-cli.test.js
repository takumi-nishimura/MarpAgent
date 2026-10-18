const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function isolatedRepo(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "marp-design-cli-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const relative of [
        ".mise.toml",
        "src/runtime-version.js",
        "scripts/generate-design-tokens.js",
        "scripts/lint-designs.js",
    ]) {
        const target = path.join(root, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(__dirname, "../..", relative), target);
    }
    return root;
}

function run(root, script, args = []) {
    return spawnSync(
        process.execPath,
        [path.join(root, "scripts", script), ...args],
        {
            encoding: "utf8",
            timeout: 10000,
        },
    );
}

test("missing design produces a concise diagnostic without a stack", (t) => {
    const result = run(isolatedRepo(t), "generate-design-tokens.js", [
        "--design",
        "missing",
    ]);
    assert.equal(result.status, 1);
    assert.match(
        result.stderr,
        /Design file not found: .*missing[/\\]DESIGN\.md/,
    );
    assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test("design lint reports a missing executable instead of failing silently", (t) => {
    const root = isolatedRepo(t);
    fs.mkdirSync(path.join(root, "designs", "sample"), { recursive: true });
    fs.writeFileSync(
        path.join(root, "designs", "sample", "DESIGN.md"),
        "# Sample",
    );
    const result = run(root, "lint-designs.js");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot run .*designmd.*ENOENT/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test("missing designs directory reports the failing operation without a stack", (t) => {
    const result = run(isolatedRepo(t), "lint-designs.js");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Failed to lint designs:.*ENOENT/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
});
