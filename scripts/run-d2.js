const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn, execFile } = require("node:child_process");
const { killProcessTree } = require("../src/conversion-runtime");

const POLL_INTERVAL_MS = 25;
const PROCESS_TOKEN_ENV = "MARP_AGENT_D2_PROCESS_TOKEN";

function linuxProcess(pid) {
    try {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
        const fields = stat.slice(stat.lastIndexOf(") ") + 2).split(" ");
        return { parent: Number(fields[1]), start: fields[19] };
    } catch {
        return null;
    }
}

function sameProcess(pid, start) {
    return (
        process.platform !== "linux" ||
        (start != null && linuxProcess(pid)?.start === start)
    );
}

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
    const remembered = new Map();
    let pipeLinks = [];
    let pollTimer;
    let pollInFlight = false;

    // This marker is private to one invocation and overrides any inherited
    // value. On Linux it identifies inherited-environment descendants even
    // after reparenting, without relying on output pipes or a timely ps poll.
    const processToken = crypto.randomBytes(32).toString("hex");
    const processMarker = `${PROCESS_TOKEN_ENV}=${processToken}`;
    const child = spawn(command, args.map(String), {
        cwd,
        env:
            process.platform === "linux"
                ? { ...(env ?? process.env), [PROCESS_TOKEN_ENV]: processToken }
                : env,
        detached: process.platform !== "win32",
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
    });
    const childStart =
        process.platform === "linux" ? linuxProcess(child.pid)?.start : null;

    function remember(pid, expectedParent) {
        const info = process.platform === "linux" ? linuxProcess(pid) : null;
        if (
            process.platform === "linux" &&
            (!info || info.parent !== expectedParent)
        )
            return false;
        remembered.set(pid, info?.start);
        return true;
    }

    // A Linux descendant may retain the output pipes while replacing its
    // environment. Remember those endpoints as another ownership signal even
    // when the orphan was never seen by a process-table snapshot.
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

    function scanLinuxOwners() {
        if (process.platform !== "linux") return;
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
            const identity = linuxProcess(pid);
            if (!identity) continue;
            let owned = false;
            try {
                owned = fs
                    .readFileSync(`/proc/${entry}/environ`, "utf8")
                    .split("\0")
                    .includes(processMarker);
            } catch {
                // Inaccessible or already-exited processes cannot match.
            }
            for (const fd of [1, 2]) {
                if (owned) break;
                try {
                    if (
                        pipeLinks.includes(
                            fs.readlinkSync(`/proc/${entry}/fd/${fd}`),
                        )
                    ) {
                        owned = true;
                        break;
                    }
                } catch {
                    // Races with process exit are expected.
                }
            }
            if (owned && sameProcess(pid, identity.start))
                remembered.set(pid, identity.start);
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
                const roots = new Set(
                    [...remembered]
                        .filter(([pid, start]) => sameProcess(pid, start))
                        .map(([pid]) => pid),
                );
                if (sameProcess(child.pid, childStart)) roots.add(child.pid);
                let changed = true;
                while (changed) {
                    changed = false;
                    for (const row of table.split("\n")) {
                        const [pid, ppid] = row.trim().split(/\s+/).map(Number);
                        if (roots.has(ppid) && !roots.has(pid)) {
                            if (remember(pid, ppid)) {
                                roots.add(pid);
                                changed = true;
                            }
                        }
                    }
                }
            }
            pollTimer = setTimeout(pollDescendants, POLL_INTERVAL_MS);
        });
    }

    function cleanupTree(signalName = "SIGKILL") {
        scanLinuxOwners();
        if (sameProcess(child.pid, childStart))
            killProcessTree(child.pid, signalName);
        for (const [pid, start] of remembered) {
            if (!sameProcess(pid, start)) continue;
            if (process.platform !== "linux")
                try {
                    process.kill(-pid, signalName);
                } catch {}
            try {
                process.kill(pid, signalName);
            } catch {}
        }
        // Catch a child forked while the first ownership snapshot was read.
        // This is bounded cleanup for the trusted CLI, not hostile containment.
        if (process.platform === "linux") {
            scanLinuxOwners();
            for (const [pid, start] of remembered) {
                if (!sameProcess(pid, start)) continue;
                try {
                    process.kill(pid, signalName);
                } catch {}
            }
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
