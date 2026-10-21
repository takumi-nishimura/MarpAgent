const fs = require("node:fs");
const { spawn, execFile } = require("node:child_process");
const { killProcessTree } = require("../src/conversion-runtime");

const POLL_INTERVAL_MS = 25;

async function readRequest() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function emit(envelope) {
    fs.writeSync(1, JSON.stringify(envelope));
    process.exit(0);
}

async function main() {
    let request;
    try {
        request = await readRequest();
    } catch (error) {
        emit({
            status: null,
            signal: null,
            timedOut: false,
            overflow: null,
            startError: {
                code: "D2_PROTOCOL",
                message: `invalid supervisor request: ${error.message}`,
            },
            stdout: "",
            stderr: "",
        });
        return;
    }
    const {
        parentPid,
        command,
        args = [],
        cwd,
        env,
        timeoutMs = 30000,
        maxBuffer = 16777216,
        input = "",
    } = request;

    let settled = false;
    let status = null;
    let signal = null;
    let timedOut = false;
    let overflow = null;
    let startError = null;
    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const remembered = new Set();
    let pipeLinks = [];
    let pollTimer;
    let pollInFlight = false;

    const child = spawn(command, args.map(String), {
        cwd,
        env,
        detached: process.platform !== "win32",
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
    });

    // On Linux, an orphan that outlives its root keeps the inherited output
    // pipes. Remember the pipe endpoints now so cleanup can find the owner even
    // when it was never seen by a process-table snapshot.
    if (process.platform === "linux") {
        for (const fd of [1, 2]) {
            try {
                const link = fs.readlinkSync(`/proc/${child.pid}/fd/${fd}`);
                if (/^(pipe|socket):\[\d+\]$/.test(link)) pipeLinks.push(link);
            } catch {
                // The target may already be gone; nothing to remember.
            }
        }
    }

    function scanFdOwners() {
        if (process.platform !== "linux" || pipeLinks.length === 0) return;
        let entries;
        try {
            entries = fs.readdirSync("/proc");
        } catch {
            return;
        }
        for (const entry of entries) {
            if (!/^\d+$/.test(entry)) continue;
            const pid = Number(entry);
            if (pid === process.pid) continue;
            for (const fd of [1, 2]) {
                try {
                    if (
                        pipeLinks.includes(
                            fs.readlinkSync(`/proc/${entry}/fd/${fd}`),
                        )
                    ) {
                        remembered.add(pid);
                        break;
                    }
                } catch {
                    // Races with process exit are expected.
                }
            }
        }
    }

    function pollDescendants() {
        if (settled || pollInFlight) return;
        if (parentPid && process.ppid !== parentPid) {
            startError = {
                code: "D2_PARENT_EXIT",
                message: "D2 caller exited before compilation completed",
            };
            finish();
            return;
        }
        pollInFlight = true;
        execFile("ps", ["-A", "-o", "pid=,ppid="], (error, table) => {
            pollInFlight = false;
            if (settled) return;
            if (!error) {
                const roots = new Set([child.pid, ...remembered]);
                let changed = true;
                while (changed) {
                    changed = false;
                    for (const row of table.split("\n")) {
                        const [pid, ppid] = row.trim().split(/\s+/).map(Number);
                        if (roots.has(ppid) && !roots.has(pid)) {
                            roots.add(pid);
                            remembered.add(pid);
                            changed = true;
                        }
                    }
                }
            }
            pollTimer = setTimeout(pollDescendants, POLL_INTERVAL_MS);
        });
    }

    function cleanupTree(signalName = "SIGKILL") {
        scanFdOwners();
        killProcessTree(child.pid, signalName);
        for (const pid of remembered) {
            try {
                process.kill(-pid, signalName);
            } catch {}
            try {
                process.kill(pid, signalName);
            } catch {}
        }
    }

    function finish() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(pollTimer);
        process.removeListener("SIGTERM", onSignal);
        process.removeListener("SIGINT", onSignal);
        for (const stream of [child.stdin, child.stdout, child.stderr]) {
            try {
                stream?.destroy();
            } catch {}
        }
        cleanupTree();
        emit({
            status,
            signal,
            timedOut,
            overflow,
            startError,
            stdout: trimIncompleteUtf8(Buffer.concat(stdoutChunks)).toString(
                "base64",
            ),
            stderr: trimIncompleteUtf8(Buffer.concat(stderrChunks)).toString(
                "base64",
            ),
        });
    }

    // The deadline covers the whole run until pipes close, so a zero-exited
    // root whose descendants hold stdout open still times out.
    const timer = setTimeout(() => {
        timedOut = true;
        finish();
    }, timeoutMs);

    function onSignal(sig) {
        cleanupTree(sig);
        startError = { code: sig, message: `supervisor received ${sig}` };
        finish();
    }
    process.on("SIGTERM", onSignal);
    process.on("SIGINT", onSignal);

    // A byte-truncated capture must not leave half a UTF-8 sequence, which the
    // caller would decode as a replacement character beyond the byte budget.
    function trimIncompleteUtf8(buffer) {
        let end = buffer.length;
        for (let index = Math.max(0, end - 3); index < end; index++) {
            const byte = buffer[index];
            const length =
                byte < 0x80
                    ? 1
                    : byte < 0xc0
                      ? 0
                      : byte < 0xe0
                        ? 2
                        : byte < 0xf0
                          ? 3
                          : 4;
            if (length > 0 && index + length > end) {
                end = index;
                break;
            }
        }
        return buffer.subarray(0, end);
    }

    function collect(streamName, chunks) {
        return (chunk) => {
            if (settled) return;
            const used = streamName === "stdout" ? stdoutBytes : stderrBytes;
            const next = used + chunk.length;
            if (next > maxBuffer) {
                const keep = chunk.length - (next - maxBuffer);
                if (keep > 0) chunks.push(chunk.subarray(0, keep));
                if (streamName === "stdout") stdoutBytes = maxBuffer;
                else stderrBytes = maxBuffer;
                overflow = overflow || streamName;
                finish();
                return;
            }
            if (streamName === "stdout") stdoutBytes = next;
            else stderrBytes = next;
            chunks.push(chunk);
        };
    }
    child.stdout.on("data", collect("stdout", stdoutChunks));
    child.stderr.on("data", collect("stderr", stderrChunks));

    child.once("error", (error) => {
        startError = {
            code: error.code || "UNKNOWN",
            message: error.message,
        };
        finish();
    });
    child.on("exit", (code, sig) => {
        status = code;
        signal = sig;
    });
    child.once("close", (code, sig) => {
        if (status === null && signal === null) {
            status = code;
            signal = sig;
        }
        finish();
    });

    // A target that exits without reading stdin raises EPIPE; that is not a
    // start failure, only a closed input.
    child.stdin.on("error", () => {});
    const payload = Buffer.from(input, "base64");
    if (payload.length > 0) child.stdin.write(payload);
    child.stdin.end();

    pollDescendants();
}

main().catch((error) => {
    emit({
        status: null,
        signal: null,
        timedOut: false,
        overflow: null,
        startError: {
            code: "D2_PROTOCOL",
            message: `supervisor failure: ${error.message}`,
        },
        stdout: "",
        stderr: "",
    });
});
