const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
// Follow the exact MathJax menu dependency route covered by the scoped override.
const mathjaxRequire = createRequire(
    require.resolve("@mathjax/src/package.json"),
);
const rootRequire = createRequire(
    mathjaxRequire.resolve("mj-context-menu/package.json"),
);
const rimrafPackage = rootRequire.resolve("rimraf/package.json");
const rimrafRequire = createRequire(rimrafPackage);
const globRequire = createRequire(rimrafRequire.resolve("glob/package.json"));
const { glob } = rimrafRequire("glob");
const { Minimatch } = globRequire("minimatch");
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mathjax-cleanup-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const file of [
        "a.js",
        "b.js",
        ".hidden.js",
        "keep.txt",
        "nested/c.js",
        "nested/keep.js",
        "literal[1]",
    ]) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), "fixture");
    }
    return root;
}
for (const format of ["require", "import"]) {
    test(
        "rimraf " + format + " preserves literal and glob deletion selection",
        async (t) => {
            const api =
                format === "require"
                    ? rootRequire("rimraf")
                    : await import(
                          pathToFileURL(
                              path.resolve(
                                  path.dirname(rimrafPackage),
                                  rootRequire("rimraf/package.json").exports[
                                      "."
                                  ].import.default,
                              ),
                          ).href
                      );
            for (const sync of [false, true]) {
                const root = fixture(t);
                const remove = sync ? api.rimrafSync : api.rimraf;
                assert.equal(await remove(path.join(root, "literal[1]")), true);
                assert.equal(
                    await remove(["*.js", "nested/*.js"], {
                        glob: {
                            cwd: root,
                            ignore: "nested/keep.js",
                            nodir: true,
                        },
                    }),
                    true,
                );
                for (const name of [
                    "a.js",
                    "b.js",
                    "nested/c.js",
                    "literal[1]",
                ])
                    assert.equal(
                        fs.existsSync(path.join(root, name)),
                        false,
                        name,
                    );
                for (const name of [".hidden.js", "keep.txt", "nested/keep.js"])
                    assert.equal(
                        fs.existsSync(path.join(root, name)),
                        true,
                        name,
                    );
                assert.equal(
                    await remove("*.js", { glob: { cwd: root, dot: true } }),
                    true,
                );
                assert.equal(
                    fs.existsSync(path.join(root, ".hidden.js")),
                    false,
                );
                assert.equal(
                    await remove("missing-*", { glob: { cwd: root } }),
                    true,
                );
            }
        },
    );
}
test("rimraf CLI still accepts the literal directories used by the MathJax menu build", (t) => {
    const root = fixture(t);
    for (const name of ["cjs", "js", "dist"])
        fs.mkdirSync(path.join(root, name));
    execFileSync(
        process.execPath,
        [
            path.resolve(
                path.dirname(rimrafPackage),
                rootRequire("rimraf/package.json").bin,
            ),
            "cjs",
            "js",
            "dist",
        ],
        { cwd: root },
    );
    for (const name of ["cjs", "js", "dist"])
        assert.equal(fs.existsSync(path.join(root, name)), false);
    assert.equal(fs.existsSync(path.join(root, "keep.txt")), true);
});
test("glob stops reading descendant directories when its first read is aborted", async (t) => {
    const root = fixture(t);
    fs.mkdirSync(path.join(root, "nested", "deeper"));
    const controller = new AbortController();
    let reads = 0;
    const customFs = {
        readdir(dir, options, callback) {
            reads++;
            const entries = fs.readdirSync(dir, options);
            queueMicrotask(() => {
                if (!controller.signal.aborted)
                    controller.abort(new Error("stop traversal"));
                callback(null, entries);
            });
        },
    };
    await assert.rejects(
        glob("**/*", { cwd: root, fs: customFs, signal: controller.signal }),
        /stop traversal/,
    );
    // All callbacks use microtasks, so one event-loop turn drains pending work.
    await new Promise(setImmediate);
    assert.equal(
        reads,
        1,
        "aborting must stop traversal, not just reject the promise",
    );
});
test("minimatch bounds globstar-parent pattern expansion and retains ordinary matches", () => {
    const pattern = "a/**/../b/c/".repeat(6) + "leaf.txt";
    const compiled = new Minimatch(pattern, {
        optimizationLevel: 2,
        braceExpandMax: 4,
    });
    assert.ok(
        compiled.set.length <= 4,
        "compiled alternatives must respect the allocation budget",
    );
    const ordinary = new Minimatch("**/*.{js,ts}", { optimizationLevel: 2 });
    assert.equal(ordinary.match("nested/source.js"), true);
    assert.equal(ordinary.match("nested/source.txt"), false);
});

test("glob bundled matcher respects the expansion budget in both module formats", async () => {
    const pkg = rimrafRequire("glob/package.json");
    const base = path.dirname(rimrafRequire.resolve("glob/package.json"));
    for (const api of [
        rimrafRequire("glob"),
        await import(
            pathToFileURL(path.resolve(base, pkg.exports["."].import.default))
                .href
        ),
    ]) {
        const compiled = new api.Glob("a/**/../b/c/".repeat(6) + "leaf.txt", {
            optimizationLevel: 2,
            braceExpandMax: 4,
        });
        assert.ok(
            compiled.patterns.length <= 4,
            "the default bundled export must include the minimatch fix",
        );
    }
});
