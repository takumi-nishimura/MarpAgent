const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SUPERVISOR = path.join(__dirname, "../scripts/run-d2.js");
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_BUFFER = 16 * 1024 * 1024;
const ENVELOPE_OVERHEAD = 64 * 1024;

function failure(code, message, details = {}) {
    const error = new Error(message);
    error.code = code;
    return Object.assign(error, details);
}

function validateLimits(timeoutMs, maxBuffer) {
    if (
        !Number.isInteger(timeoutMs) ||
        timeoutMs <= 0 ||
        timeoutMs > 2147483647
    )
        throw new RangeError(
            "timeoutMs must be a positive integer up to 2147483647.",
        );
    if (!Number.isSafeInteger(maxBuffer) || maxBuffer < 0)
        throw new RangeError("maxBuffer must be a nonnegative safe integer.");
}

// Synchronous render callers stay synchronous while a short-lived supervisor
// subprocess owns the deadline, byte limits and process-tree cleanup. The
// supervisor emits one JSON envelope with base64 streams on stdout; target
// output never shares the protocol channel.
function runD2ProcessSync(
    command,
    args,
    {
        input,
        cwd,
        env,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        maxBuffer = DEFAULT_MAX_BUFFER,
    } = {},
) {
    validateLimits(timeoutMs, maxBuffer);
    const source = Buffer.isBuffer(input)
        ? input
        : Buffer.from(input ?? "", "utf8");
    const request = JSON.stringify({
        parentPid: process.pid,
        command: String(command),
        args: (args ?? []).map(String),
        cwd,
        env,
        timeoutMs,
        maxBuffer,
        input: source.toString("base64"),
    });
    // The envelope carries two independently capped base64 streams plus control
    // fields, so the blocking protocol buffer is larger than the target limit.
    const protocolBuffer = Math.max(
        1024 * 1024,
        Math.ceil(maxBuffer / 3) * 8 + ENVELOPE_OVERHEAD,
    );
    const result = spawnSync(process.execPath, [SUPERVISOR], {
        input: request,
        encoding: "utf8",
        maxBuffer: protocolBuffer,
        shell: false,
    });
    const empty = { status: null, signal: null, stdout: "", stderr: "" };
    if (result.error)
        throw failure(
            "D2_PROCESS_START",
            `D2 process supervisor failed to run ${command}: ${result.error.message}`,
            empty,
        );
    let envelope;
    try {
        envelope = JSON.parse(result.stdout);
    } catch {
        envelope = null;
    }
    if (!envelope || typeof envelope !== "object")
        throw failure(
            "D2_PROCESS_START",
            `D2 process supervisor returned no usable result for ${command}: ${result.stderr || "invalid protocol output"}`,
            empty,
        );
    const stdout = Buffer.from(envelope.stdout ?? "", "base64").toString(
        "utf8",
    );
    const stderr = Buffer.from(envelope.stderr ?? "", "base64").toString(
        "utf8",
    );
    const details = {
        status: typeof envelope.status === "number" ? envelope.status : null,
        signal: envelope.signal ?? null,
        stdout,
        stderr,
    };
    if (envelope.startError)
        throw failure(
            "D2_PROCESS_START",
            `D2 failed to start ${command}: ${envelope.startError.message}`,
            { ...details, startCode: envelope.startError.code },
        );
    if (envelope.timedOut)
        throw failure(
            "D2_PROCESS_TIMEOUT",
            `D2 process ${command} did not finish within ${timeoutMs} ms.`,
            details,
        );
    if (envelope.overflow)
        throw failure(
            "D2_PROCESS_BUFFER",
            `D2 process ${command} ${envelope.overflow} output exceeded the ${maxBuffer} byte limit.`,
            details,
        );
    if (envelope.status !== 0 || envelope.signal) {
        const end = envelope.signal
            ? `signal ${envelope.signal}`
            : `status ${envelope.status}`;
        throw failure(
            "D2_PROCESS_EXIT",
            `D2 process ${command} exited with ${end}.`,
            details,
        );
    }
    return { stdout, stderr };
}

module.exports = { runD2ProcessSync };
