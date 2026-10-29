const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");

const DEFAULT_TIMEOUT_MS = 120000;

function conversionTimeout(env = process.env) {
  const value = env.MARP_AGENT_CONVERT_TIMEOUT_MS;
  if (value === undefined) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(parsed) ||
    parsed <= 0 ||
    parsed > 2147483647
  ) {
    throw new Error(
      "MARP_AGENT_CONVERT_TIMEOUT_MS must be a positive integer in milliseconds (1–2147483647); unset it to use 120000 ms.",
    );
  }
  return parsed;
}

function timeoutError(timeoutMs) {
  const error = new Error(
    `Conversion did not finish within ${timeoutMs} ms; the browser may have stalled. Set CHROME_PATH to a working Chrome or Edge executable, or raise MARP_AGENT_CONVERT_TIMEOUT_MS.`,
  );
  error.code = "CONVERSION_TIMEOUT";
  return error;
}

// Chromium may start a separate process group. Snapshot descendants before
// killing the Marp parent so those groups cannot be orphaned by the timeout.
function killProcessTree(pid, signal = "SIGKILL") {
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {}
    return;
  }
  const descendants = new Set([pid]);
  try {
    const rows = execFileSync("ps", ["-A", "-o", "pid=,ppid="], {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .map((row) => row.trim().split(/\s+/).map(Number));
    let changed;
    do {
      changed = false;
      for (const [child, parent] of rows) {
        if (descendants.has(parent) && !descendants.has(child)) {
          descendants.add(child);
          changed = true;
        }
      }
    } while (changed);
  } catch {
    // The process group still covers children that did not detach themselves.
  }
  for (const child of [...descendants].reverse()) {
    try {
      process.kill(-child, signal);
    } catch {}
    try {
      process.kill(child, signal);
    } catch {}
  }
}

function runConversion(
  command,
  args,
  { cwd, env, timeoutMs = conversionTimeout(), stdio = "inherit" } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio,
      detached: process.platform !== "win32",
    });
    let timedOut = false;
    const signals = new Map(
      ["SIGINT", "SIGTERM"].map((signal) => [
        signal,
        () => killProcessTree(child.pid, signal),
      ]),
    );
    for (const [signal, handler] of signals) process.on(signal, handler);
    const timer =
      timeoutMs == null
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            killProcessTree(child.pid);
          }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      for (const [signal, handler] of signals)
        process.removeListener(signal, handler);
    };
    child.once("error", (error) => {
      cleanup();
      reject(
        new Error(`Failed to start ${command}: ${error.message}`, {
          cause: error,
        }),
      );
    });
    child.once("close", (code, signal) => {
      cleanup();
      if (timedOut) reject(timeoutError(timeoutMs));
      else resolve(signal ? (signal === "SIGINT" ? 130 : 143) : (code ?? 1));
    });
  });
}

// Keep synchronous render callers synchronous, while a separate supervisor
// owns the deadline and can stop the entire conversion process tree.
function runConversionSync(
  command,
  args,
  { cwd, env, timeoutMs = conversionTimeout() } = {},
) {
  return execFileSync(
    process.execPath,
    [
      path.join(__dirname, "../scripts/run-conversion.js"),
      JSON.stringify({ command, args, cwd, timeoutMs }),
    ],
    {
      encoding: "utf8",
      env,
      stdio: "pipe",
      maxBuffer: 32 * 1024 * 1024,
    },
  );
}

async function withBrowser(
  operation,
  {
    timeoutMs = conversionTimeout(),
    chromium = require("playwright").chromium,
  } = {},
) {
  let server;
  let timer;
  let timedOut = false;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      // BrowserServer.kill terminates Chromium's whole process group and
      // does not wait for an unresponsive browser protocol connection.
      Promise.resolve(server?.kill()).catch(() => {});
      reject(timeoutError(timeoutMs));
    }, timeoutMs);
  });
  const work = (async () => {
    server = await chromium.launchServer({
      headless: true,
      timeout: timeoutMs,
      host: "127.0.0.1",
    });
    if (timedOut) {
      await server.kill();
      throw timeoutError(timeoutMs);
    }
    const browser = await chromium.connect(server.wsEndpoint(), {
      timeout: timeoutMs,
    });
    const result = await operation(browser);
    await browser.close();
    await server.close();
    return result;
  })();
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
    if (server) await server.kill().catch(() => {});
  }
}

module.exports = {
  conversionTimeout,
  killProcessTree,
  runConversion,
  runConversionSync,
  timeoutError,
  withBrowser,
};
