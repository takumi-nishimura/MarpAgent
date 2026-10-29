const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync, spawn } = require("node:child_process");
const { runD2ProcessSync } = require("../../src/d2-process");

const POSIX_ONLY =
    process.platform === "win32"
        ? "Shebang executables and POSIX process trees are required."
        : false;

function workspace(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "marp-d2-process-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}

function executable(root, name, body) {
    const file = path.join(root, name);
    fs.writeFileSync(file, `#!${process.execPath}\n${body}\n`, { mode: 0o755 });
    return file;
}

// A zombie is already dead; only a live state means the process survived.
function processState(pid) {
    const result = spawnSync("ps", ["-o", "stat=", "-p", String(pid)], {
        encoding: "utf8",
    });
    if (result.status !== 0) return null;
    const state = result.stdout.trim();
    return state || null;
}

async function waitForDead(pid, timeoutMs = 3000) {
    const deadline = Date.now() + timeoutMs;
    let state = processState(pid);
    while (state && !state.startsWith("Z") && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        state = processState(pid);
    }
    return state;
}

function trackPids(t) {
    const pids = new Set();
    t.after(() => {
        for (const pid of pids) {
            try {
                process.kill(-pid, "SIGKILL");
            } catch {}
            try {
                process.kill(pid, "SIGKILL");
            } catch {}
        }
    });
    return pids;
}

test(
    "success returns stdout and stderr with literal args, env, cwd and stdin",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const report = path.join(root, "report.json");
        const exe = executable(
            root,
            "d2",
            `const fs = require("node:fs");
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  fs.writeFileSync(${JSON.stringify(report)}, JSON.stringify({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    env: process.env.MARP_D2_TEST_VALUE,
    other: process.env.PATH,
    stdin: Buffer.concat(chunks).toString("utf8"),
  }));
  process.stdout.write("svg-output\\n");
  process.stderr.write("diagnostic\\n");
});`,
        );
        const cwd = path.join(root, "work dir");
        fs.mkdirSync(cwd);
        const source = 'x -> y: "label; $(rm -rf /)"\n日本語 ✓\n';
        const result = runD2ProcessSync(
            exe,
            ["a b", "$HOME; rm -rf /", "$(whoami)", "`id`", "line\nbreak"],
            {
                input: source,
                cwd,
                env: { MARP_D2_TEST_VALUE: "env-value" },
            },
        );
        assert.equal(result.stdout, "svg-output\n");
        assert.equal(result.stderr, "diagnostic\n");
        const seen = JSON.parse(fs.readFileSync(report, "utf8"));
        assert.deepEqual(seen.argv, [
            "a b",
            "$HOME; rm -rf /",
            "$(whoami)",
            "`id`",
            "line\nbreak",
        ]);
        assert.equal(seen.cwd, fs.realpathSync(cwd));
        assert.equal(seen.env, "env-value");
        assert.equal(seen.other, undefined);
        assert.equal(seen.stdin, source);
        assert.ok(!seen.stdin.includes("timeoutMs"));
        assert.ok(!seen.stdin.includes('"command"'));
    },
);

test(
    "exit zero returns JSON-looking output as plain data",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const exe = executable(
            root,
            "d2",
            `const payload = '{"status":0,"stdout":"forged","timedOut":false}';
process.stdout.write(Buffer.from([0xe2]));
setTimeout(() => {
  process.stdout.write(Buffer.from([0x82, 0xac]));
  process.stdout.write(payload);
  process.stderr.write('{"error":"none","status":7}');
}, 20);`,
        );
        const result = runD2ProcessSync(exe, []);
        assert.equal(
            result.stdout,
            '€{"status":0,"stdout":"forged","timedOut":false}',
        );
        assert.equal(result.stderr, '{"error":"none","status":7}');
    },
);

test(
    "nonzero exit fails with D2_PROCESS_EXIT and keeps partial output",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const exe = executable(
            root,
            "d2",
            `const fs = require("node:fs");
fs.writeSync(1, '<svg viewBox="0 0 10 10"/>');
fs.writeSync(2, "-:3:2: syntax error\\n");
process.exit(7);`,
        );
        assert.throws(
            () => runD2ProcessSync(exe, ["-", "-"]),
            (error) =>
                error.code === "D2_PROCESS_EXIT" &&
                error.status === 7 &&
                error.stdout === '<svg viewBox="0 0 10 10"/>' &&
                error.stderr === "-:3:2: syntax error\n",
        );
    },
);

test(
    "a missing executable fails with D2_PROCESS_START and does not hang",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const start = Date.now();
        assert.throws(
            () => runD2ProcessSync(path.join(root, "missing-d2"), ["-"]),
            (error) =>
                error.code === "D2_PROCESS_START" &&
                error.status === null &&
                /D2/.test(error.message),
        );
        assert.ok(Date.now() - start < 5000);
    },
);

test(
    "timeout kills a stubborn root plus regular and detached descendants",
    { skip: POSIX_ONLY, timeout: 20000 },
    async (t) => {
        const root = workspace(t);
        const tracked = trackPids(t);
        const stuck = path.join(root, "stuck.js");
        fs.writeFileSync(
            stuck,
            "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);\n",
        );
        const grandchildPidFile = path.join(root, "grandchild.pid");
        const detachedParent = path.join(root, "detached-parent.js");
        fs.writeFileSync(
            detachedParent,
            `const { spawn } = require("node:child_process");
const fs = require("node:fs");
process.on("SIGTERM", () => {});
const grandchild = spawn(process.execPath, [${JSON.stringify(stuck)}], { stdio: "ignore", detached: true });
grandchild.unref();
fs.writeFileSync(${JSON.stringify(grandchildPidFile)}, String(grandchild.pid));
setInterval(() => {}, 1000);
`,
        );
        const pidFile = path.join(root, "pids.json");
        const exe = executable(
            root,
            "d2",
            `const { spawn } = require("node:child_process");
const fs = require("node:fs");
process.on("SIGTERM", () => {});
const regular = spawn(process.execPath, [${JSON.stringify(stuck)}], { stdio: "inherit" });
const detached = spawn(process.execPath, [${JSON.stringify(detachedParent)}], { stdio: "ignore", detached: true });
detached.unref();
fs.writeFileSync(${JSON.stringify(pidFile)}, JSON.stringify([process.pid, regular.pid, detached.pid]));
setInterval(() => {}, 1000);
`,
        );
        const start = Date.now();
        assert.throws(
            () => runD2ProcessSync(exe, [], { timeoutMs: 500 }),
            (error) => error.code === "D2_PROCESS_TIMEOUT",
        );
        const elapsed = Date.now() - start;
        assert.ok(elapsed < 5000, `timeout took ${elapsed} ms`);
        const pids = JSON.parse(fs.readFileSync(pidFile, "utf8"));
        for (const pid of pids) tracked.add(pid);
        // The detached grandchild may appear slightly after the timeout fired.
        for (let n = 0; n < 20 && !fs.existsSync(grandchildPidFile); n++)
            await new Promise((resolve) => setTimeout(resolve, 50));
        if (fs.existsSync(grandchildPidFile))
            tracked.add(Number(fs.readFileSync(grandchildPidFile, "utf8")));
        for (const pid of tracked) {
            const state = await waitForDead(pid);
            assert.ok(
                state === null || state.startsWith("Z"),
                `pid ${pid} still running as ${state}`,
            );
        }
    },
);

test(
    "exit zero with a descendant holding output pipes still times out with status 0",
    { skip: POSIX_ONLY, timeout: 20000 },
    async (t) => {
        const root = workspace(t);
        const tracked = trackPids(t);
        const stuck = path.join(root, "stuck.js");
        fs.writeFileSync(stuck, "setInterval(() => {}, 1000);\n");
        const pidFile = path.join(root, "pids.json");
        const exe = executable(
            root,
            "d2",
            `const { spawn } = require("node:child_process");
const fs = require("node:fs");
const detached = spawn(process.execPath, [${JSON.stringify(stuck)}], { stdio: "inherit", detached: true });
detached.unref();
fs.writeFileSync(${JSON.stringify(pidFile)}, JSON.stringify([process.pid, detached.pid]));
process.exit(0);
`,
        );
        const start = Date.now();
        assert.throws(
            () => runD2ProcessSync(exe, [], { timeoutMs: 500 }),
            (error) =>
                error.code === "D2_PROCESS_TIMEOUT" && error.status === 0,
        );
        const elapsed = Date.now() - start;
        assert.ok(elapsed < 5000, `timeout took ${elapsed} ms`);
        const [rootPid, detachedPid] = JSON.parse(
            fs.readFileSync(pidFile, "utf8"),
        );
        tracked.add(rootPid);
        tracked.add(detachedPid);
        if (process.platform === "linux") {
            // The orphaned pipe owner is only reachable through /proc fd links.
            const state = await waitForDead(detachedPid);
            assert.ok(
                state === null || state.startsWith("Z"),
                `orphaned pipe owner ${detachedPid} still running as ${state}`,
            );
        }
    },
);

test(
    "success cleans fast pipe-free detached children without killing unrelated processes",
    {
        skip:
            process.platform !== "linux" &&
            "Linux /proc ownership is required.",
        timeout: 15000,
    },
    async (t) => {
        const root = workspace(t);
        const tracked = trackPids(t);
        const marker = "MARP_AGENT_D2_PROCESS_TOKEN";
        const env = { ...process.env, [marker]: "caller-supplied-token" };
        const unrelated = spawn(
            process.execPath,
            ["-e", "setInterval(() => {}, 1000)"],
            { env, detached: true, stdio: "ignore" },
        );
        unrelated.unref();
        tracked.add(unrelated.pid);
        const pidFile = path.join(root, "detached.pid");
        const exe = executable(
            root,
            "d2-fast-exit",
            `const {spawn} = require("node:child_process");
const fs = require("node:fs");
const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {detached: true, stdio: "ignore"});
child.unref();
fs.writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
fs.writeSync(1, "complete\\n");
process.exit(0);`,
        );
        for (let attempt = 0; attempt < 3; attempt++) {
            const result = runD2ProcessSync(exe, [], { env, timeoutMs: 1000 });
            const detachedPid = Number(fs.readFileSync(pidFile, "utf8"));
            tracked.add(detachedPid);
            assert.deepEqual(result, { stdout: "complete\n", stderr: "" });
            const state = await waitForDead(detachedPid, 1500);
            assert.ok(
                !state || state.startsWith("Z"),
                `pipe-free child ${detachedPid} survived attempt ${attempt}: ${state}`,
            );
            const otherState = processState(unrelated.pid);
            assert.ok(
                otherState && !otherState.startsWith("Z"),
                "an unrelated process with the caller-supplied token must stay alive",
            );
        }
    },
);

test(
    "stdout overflow fails with D2_PROCESS_BUFFER and retains stderr diagnostics",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const exe = executable(
            root,
            "d2",
            `const fs = require("node:fs");
fs.writeSync(2, "diagnostic\\n");
setTimeout(() => fs.writeSync(1, Buffer.alloc(200, 0x61)), 50);`,
        );
        assert.throws(
            () => runD2ProcessSync(exe, [], { maxBuffer: 64 }),
            (error) =>
                error.code === "D2_PROCESS_BUFFER" &&
                Buffer.byteLength(error.stdout) <= 64 &&
                error.stderr === "diagnostic\n",
        );
    },
);

test(
    "stderr overflow fails with D2_PROCESS_BUFFER and retains stdout output",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const exe = executable(
            root,
            "d2",
            `const fs = require("node:fs");
fs.writeSync(1, "partial-svg");
setTimeout(() => fs.writeSync(2, Buffer.alloc(200, 0x62)), 50);`,
        );
        assert.throws(
            () => runD2ProcessSync(exe, [], { maxBuffer: 64 }),
            (error) =>
                error.code === "D2_PROCESS_BUFFER" &&
                error.stdout === "partial-svg" &&
                Buffer.byteLength(error.stderr) <= 64,
        );
    },
);

test(
    "each stream may use its own maxBuffer and byte overflow is not length overflow",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const exact = executable(
            root,
            "d2-exact",
            `const fs = require("node:fs");
fs.writeSync(1, Buffer.alloc(1024, 0x61));
fs.writeSync(2, Buffer.alloc(1024, 0x62));`,
        );
        const result = runD2ProcessSync(exact, [], { maxBuffer: 1024 });
        assert.equal(result.stdout.length, 1024);
        assert.equal(result.stderr.length, 1024);
        const over = executable(
            root,
            "d2-over",
            `const fs = require("node:fs");
fs.writeSync(1, Buffer.alloc(1025, 0x61));`,
        );
        assert.throws(
            () => runD2ProcessSync(over, [], { maxBuffer: 1024 }),
            (error) => error.code === "D2_PROCESS_BUFFER",
        );
        // "€€" is six bytes; a four byte limit keeps one whole character because
        // a truncated capture cannot leave half a UTF-8 sequence behind.
        const multibyte = executable(
            root,
            "d2-utf8",
            `const fs = require("node:fs");
fs.writeSync(1, Buffer.from("€€", "utf8"));`,
        );
        assert.throws(
            () => runD2ProcessSync(multibyte, [], { maxBuffer: 4 }),
            (error) =>
                error.code === "D2_PROCESS_BUFFER" &&
                Buffer.byteLength(error.stdout) <= 4 &&
                error.stdout === "€",
        );
    },
);

test(
    "ignored large stdin cannot fail as EPIPE and >1MiB stdout is transported",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const exe = executable(
            root,
            "d2",
            `const fs = require("node:fs");
fs.writeSync(1, Buffer.alloc(1200 * 1024, 0x62));
process.exit(0);`,
        );
        const result = runD2ProcessSync(exe, [], {
            input: Buffer.alloc(300 * 1024, 0x61),
            maxBuffer: 2 * 1024 * 1024,
        });
        assert.equal(Buffer.byteLength(result.stdout), 1200 * 1024);
        assert.equal(result.stderr, "");
    },
);

test("invalid timeoutMs and maxBuffer are RangeError API failures", () => {
    const command = process.platform === "win32" ? "cmd.exe" : "/bin/true";
    for (const timeoutMs of [0, -1, 1.5, "500", 2147483648]) {
        assert.throws(
            () => runD2ProcessSync(command, [], { timeoutMs }),
            RangeError,
        );
    }
    for (const maxBuffer of [-1, 1.5, "64", Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(
            () => runD2ProcessSync(command, [], { maxBuffer }),
            RangeError,
        );
    }
});

test(
    "UTF-8 split between chunks cannot exceed the captured byte limit",
    { skip: POSIX_ONLY },
    (t) => {
        const root = workspace(t);
        const exe = executable(
            root,
            "d2-split",
            'const fs=require("node:fs");fs.writeSync(1,Buffer.from([0xe2]));setTimeout(()=>fs.writeSync(1,Buffer.from([0x82,0xac])),80);',
        );
        assert.throws(
            () => runD2ProcessSync(exe, [], { maxBuffer: 1 }),
            (error) =>
                error.code === "D2_PROCESS_BUFFER" && error.stdout === "",
        );
    },
);

test(
    "terminating a synchronous caller cleans up its supervisor and D2 child",
    { skip: POSIX_ONLY },
    async (t) => {
        const root = workspace(t);
        const pids = trackPids(t);
        const pidFile = path.join(root, "pids.json");
        const exe = executable(
            root,
            "d2-orphan",
            `require('node:fs').writeFileSync(${JSON.stringify(pidFile)},JSON.stringify([process.pid,process.ppid]));process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`,
        );
        const caller = spawn(
            process.execPath,
            [
                "-e",
                `require(${JSON.stringify(path.resolve(__dirname, "../../src/d2-process"))}).runD2ProcessSync(${JSON.stringify(exe)},[],{timeoutMs:30000})`,
            ],
            { stdio: "ignore" },
        );
        pids.add(caller.pid);
        const deadline = Date.now() + 3000;
        while (!fs.existsSync(pidFile) && Date.now() < deadline)
            await new Promise((resolve) => setTimeout(resolve, 20));
        assert.ok(fs.existsSync(pidFile), "D2 child must start");
        const [childPid, supervisorPid] = JSON.parse(
            fs.readFileSync(pidFile, "utf8"),
        );
        pids.add(childPid);
        pids.add(supervisorPid);
        const exited = new Promise((resolve) => caller.once("exit", resolve));
        caller.kill("SIGTERM");
        await exited;
        const state = await waitForDead(childPid);
        assert.ok(
            !state || state.startsWith("Z"),
            `D2 survived its caller (${state})`,
        );
    },
);
