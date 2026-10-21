const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { renderD2Sync, assertSelfContainedD2 } = require("../../src/d2-render");

function workspace(t, behavior = "") {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "marp-d2-test-"));
    const executable = path.join(root, "d2");
    const log = path.join(root, "calls.jsonl");
    fs.writeFileSync(
        executable,
        `#!${process.execPath}\nconst fs=require('node:fs'); const args=process.argv.slice(2); fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n'); if(args[0]==='--version'){console.log('v0.9.0');process.exit(0)} let source='';process.stdin.on('data',c=>source+=c);process.stdin.on('end',()=>{${behavior};process.stdout.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><text>Label</text></svg>')});\n`,
        { mode: 0o755 },
    );
    const env = {
        ...process.env,
        MARP_AGENT_D2_PATH: executable,
        MARP_AGENT_D2_CACHE_DIR: path.join(root, "cache"),
    };
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const calls = () =>
        fs.readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
    return { root, executable, env, calls };
}

test("D2 cache reuses validated success and invalidates source, salt and executable content", (t) => {
    const w = workspace(t);
    const options = { env: w.env, cwd: w.root, salt: "block-1" };
    const first = renderD2Sync("a -> b", options);
    assert.match(first, /<svg/);
    assert.equal(renderD2Sync("a -> b", options), first);
    assert.equal(w.calls().filter((args) => args[0] === "--version").length, 1);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 1);
    renderD2Sync("a -> c", options);
    renderD2Sync("a -> b", { ...options, salt: "block-2" });
    fs.appendFileSync(w.executable, "\n// binary changed\n");
    renderD2Sync("a -> b", options);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 4);
    fs.rmSync(w.env.MARP_AGENT_D2_CACHE_DIR, { recursive: true });
    renderD2Sync("a -> b", options);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 5);
});

test("nonzero exit with partial SVG never succeeds or enters D2 cache", (t) => {
    const w = workspace(
        t,
        `process.stdout.write('<svg viewBox="0 0 10 10"/>');process.stderr.write('-:3:2: syntax error');process.exit(7)`,
    );
    for (let n = 0; n < 2; n++)
        assert.throws(
            () =>
                renderD2Sync("a -> b", { env: w.env, cwd: w.root, salt: "x" }),
            (error) => error.code === "D2_PROCESS_EXIT",
        );
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 2);
    assert.equal(fs.existsSync(w.env.MARP_AGENT_D2_CACHE_DIR), false);
});

test("D2 inherited rendering environment is stripped without overriding source layout", (t) => {
    const w = workspace(
        t,
        `if(process.env.D2_LAYOUT || process.env.D2_BUNDLE || process.env.DEBUG || process.env.SCALE) process.exit(8); if(!source.startsWith('vars: {d2-config: {layout-engine: tala; data: {tala-seeds: [1; 2; 3]}}}\\n')) process.exit(9); if(args.some(a=>a.startsWith('--layout'))) process.exit(10)`,
    );
    renderD2Sync("vars: {d2-config: {layout-engine: elk}}\na -> b", {
        env: {
            ...w.env,
            D2_LAYOUT: "wrong",
            D2_BUNDLE: "true",
            DEBUG: "1",
            SCALE: "2",
        },
        cwd: w.root,
        salt: "x",
    });
    const args = w.calls().find((args) => args[0] !== "--version");
    assert.ok(args.includes("--bundle=false"));
    assert.ok(args.includes("--watch=false"));
    assert.ok(args.includes("--target="));
});

test("unsupported dependencies and boards are rejected before invoking D2", (t) => {
    const w = workspace(t);
    for (const source of [
        "...@other.d2",
        'x: @"../other.d2"',
        "a.icon: https://example.com/x.png",
        'a: {"icon": ./x.svg}',
        "layers: {x: {a}}",
        "scenarios: {x: {a}}",
        "steps: {x: {a}}",
        "a.link: https://example.com",
        "vars: {d2-config: {layout-engine: custom}}",
        "a: |md\n![x](https://example.com/x.png)\n|",
    ]) {
        assert.throws(
            () => renderD2Sync(source, { env: w.env, cwd: w.root, salt: "x" }),
            /self-contained|unsupported/i,
            source,
        );
    }
    assert.equal(fs.existsSync(path.join(w.root, "calls.jsonl")), false);
    assert.doesNotThrow(() =>
        assertSelfContainedD2(
            '# icon: example\na: "icon: @example"\nb: |js\nimport x from "file"\n|\na -> b',
        ),
    );
});

test("inline and inconsistent D2 block strings fail before any CLI invocation", (t) => {
    const w = workspace(t);
    for (const source of [
        "a: |js console.log(1)|\n...@./external.d2\nb: |js\nx\n|\n",
        "a: ||js console.log(1)||\n...@./external.d2\nb: ||js\nx\n||\n",
        "a: |js\nconsole.log(1)|\n...@./external.d2\nb: |js\nx\n|\n",
        "a: |!js\nx\n!|\n...@./external.d2\nb: |js\nx\n|\n",
        "a: |js\nx\n|\n...@./external.d2\n",
        "a: | js\nx\n|\n",
        "a: |js\nx\n|; unexpected\n",
        "a: ||js\nx\n|\n",
        "a: |js\nunterminated\n",
    ])
        assert.throws(
            () => renderD2Sync(source, { env: w.env, cwd: w.root }),
            { code: "D2_UNSUPPORTED_SOURCE" },
            source,
        );
    assert.equal(fs.existsSync(path.join(w.root, "calls.jsonl")), false);
    for (const source of [
        "a: |js\nimport x from '@example';\n|\n",
        "a: ||js\nconst x = a | b;\n||\n",
        "a: |latex\nx^2\n|;\n",
        "a: |\nPlain Markdown\n|\n",
        "a: |md\r\nPlain text\r\n  |\r\n",
        'a: "The pipe | is text"\n',
    ])
        assert.doesNotThrow(() => assertSelfContainedD2(source), source);
});

test("inline-block imports cannot read or share cached content across projects", (t) => {
    const w = workspace(t);
    const second = path.join(w.root, "second-project");
    fs.mkdirSync(second);
    fs.writeFileSync(path.join(w.root, "external.d2"), "FIRST_PROJECT_MARKER");
    fs.writeFileSync(path.join(second, "external.d2"), "SECOND_PROJECT_MARKER");
    const source = "a: |js console.log(1)|\n...@./external.d2\nb: |js\nx\n|\n";
    for (const cwd of [w.root, second])
        assert.throws(
            () => renderD2Sync(source, { env: w.env, cwd, salt: "shared" }),
            { code: "D2_UNSUPPORTED_SOURCE" },
        );
    assert.equal(fs.existsSync(path.join(w.root, "calls.jsonl")), false);
    assert.equal(fs.existsSync(w.env.MARP_AGENT_D2_CACHE_DIR), false);
});

test("missing CLI, unsupported version and input overflow are explicit failures", (t) => {
    const w = workspace(t);
    assert.throws(
        () =>
            renderD2Sync("a", {
                env: {
                    ...w.env,
                    MARP_AGENT_D2_PATH: path.join(w.root, "missing"),
                },
            }),
        /D2.*(?:not found|executable)/i,
    );
    if (process.platform !== "win32") {
        fs.chmodSync(w.executable, 0o644);
        assert.throws(() => renderD2Sync("a", { env: w.env }), {
            code: "D2_NOT_EXECUTABLE",
        });
        fs.chmodSync(w.executable, 0o755);
    }
    fs.writeFileSync(
        w.executable,
        `#!${process.execPath}\nconsole.log('v0.8.2')\n`,
        { mode: 0o755 },
    );
    assert.throws(() => renderD2Sync("a", { env: w.env }), /0\.9\.0/);
    assert.throws(
        () => renderD2Sync("a".repeat(1024 * 1024 + 1), { env: w.env }),
        /input.*limit/i,
    );
});

test("D2 cache detects changed font bytes and repairs corrupted SVG entries", (t) => {
    const w = workspace(t);
    const font = path.join(w.root, "font.ttf");
    fs.writeFileSync(font, "first font");
    const options = {
        env: { ...w.env, MARP_AGENT_D2_FONT_PATH: font },
        cwd: w.root,
        salt: "font",
    };
    renderD2Sync("a", options);
    renderD2Sync("a", options);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 1);
    fs.writeFileSync(font, "other font");
    renderD2Sync("a", options);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 2);
    for (const name of fs.readdirSync(w.env.MARP_AGENT_D2_CACHE_DIR))
        fs.writeFileSync(
            path.join(w.env.MARP_AGENT_D2_CACHE_DIR, name),
            "<svg>broken",
        );
    renderD2Sync("a", options);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 3);
});

test("D2 cache rechecks CSS string resources before returning a cached SVG", (t) => {
    const w = workspace(t);
    const options = { env: w.env, cwd: w.root, salt: "external-css" };
    const expected = renderD2Sync("a", options);
    const entries = fs
        .readdirSync(w.env.MARP_AGENT_D2_CACHE_DIR)
        .filter((name) => name.endsWith(".svg"));
    assert.equal(entries.length, 1);
    fs.writeFileSync(
        path.join(w.env.MARP_AGENT_D2_CACHE_DIR, entries[0]),
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" style='background-image:image-set("http://127.0.0.1:9/image.png" 1x)'/>`,
    );
    assert.equal(renderD2Sync("a", options), expected);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 2);
    assert.equal(renderD2Sync("a", options), expected);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 2);
});

test("D2 malformed success is never cached and optional cache failures do not fail a valid render", (t) => {
    const malformed = workspace(
        t,
        `process.stdout.write('<svg>broken');process.exit(0)`,
    );
    for (let n = 0; n < 2; n++)
        assert.throws(() => renderD2Sync("a", { env: malformed.env }), {
            code: "D2_SVG_INVALID",
        });
    assert.equal(
        malformed.calls().filter((args) => args[0] !== "--version").length,
        2,
    );
    assert.equal(fs.existsSync(malformed.env.MARP_AGENT_D2_CACHE_DIR), false);
    const valid = workspace(t);
    fs.writeFileSync(valid.env.MARP_AGENT_D2_CACHE_DIR, "occupied");
    assert.match(renderD2Sync("a", { env: valid.env }), /<svg/);
    assert.match(
        renderD2Sync("a", { env: { ...valid.env, MARP_AGENT_D2_CACHE: "0" } }),
        /<svg/,
    );
});

test("mise shim resolves the selected binary in the original project and changes invalidate cache", (t) => {
    const w = workspace(t);
    const shimDir = path.join(w.root, "mise", "shims");
    const binDir = path.join(w.root, "bin");
    fs.mkdirSync(shimDir, { recursive: true });
    fs.mkdirSync(binDir);
    const shim = path.join(shimDir, "d2");
    fs.symlinkSync(w.executable, shim);
    const selection = path.join(w.root, "selected");
    const context = path.join(w.root, "context");
    fs.writeFileSync(selection, w.executable);
    fs.writeFileSync(
        path.join(binDir, "mise"),
        `#!${process.execPath}\nconst fs=require('node:fs');if(process.argv[2]!=='which'||process.argv[3]!=='d2')process.exit(8);fs.writeFileSync(${JSON.stringify(context)},process.cwd());console.log(fs.readFileSync(${JSON.stringify(selection)},'utf8'));\n`,
        { mode: 0o755 },
    );
    const options = {
        cwd: w.root,
        env: {
            ...w.env,
            PATH: binDir + path.delimiter + process.env.PATH,
            MARP_AGENT_D2_PATH: shim,
        },
        salt: "mise",
    };
    renderD2Sync("a", options);
    renderD2Sync("a", options);
    assert.equal(fs.readFileSync(context, "utf8"), w.root);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 1);
    const other = path.join(w.root, "d2-other");
    fs.copyFileSync(w.executable, other);
    fs.appendFileSync(other, "\n// other build\n");
    fs.writeFileSync(selection, other);
    renderD2Sync("a", options);
    assert.equal(w.calls().filter((args) => args[0] !== "--version").length, 2);
});
