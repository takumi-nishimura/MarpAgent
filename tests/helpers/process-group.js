const { spawn, spawnSync } = require("node:child_process");

function readProcessTable({ ps = "ps" } = {}) {
  const result = spawnSync(ps, ["-eo", "pid=,ppid=,pgid=,stat="], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `Cannot inspect process groups: ${result.error?.code || result.stderr || `ps exited ${result.status}`}`,
    );
  }
  return (
    result.stdout
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .map(([pid, parent, group, state]) => ({
        pid: Number(pid),
        parent: Number(parent),
        group: Number(group),
        state,
      }))
      // Zombies cannot execute or hold sockets; their reaping belongs to the OS.
      .filter(
        ({ pid, state }) =>
          Number.isInteger(pid) && pid > 0 && !state?.startsWith("Z"),
      )
  );
}

function listProcessGroupMembers(pgid, options) {
  return readProcessTable(options)
    .filter(({ group }) => group === pgid)
    .map(({ pid }) => pid);
}

function snapshotDescendants(pid) {
  const descendants = new Set([pid]);
  if (process.platform === "win32") return [...descendants];
  const rows = readProcessTable();
  let found;
  do {
    found = false;
    for (const row of rows) {
      if (descendants.has(row.parent) && !descendants.has(row.pid)) {
        descendants.add(row.pid);
        found = true;
      }
    }
  } while (found);
  return [...descendants];
}

function killProcessGroup(pgid, signal = "SIGKILL") {
  try {
    if (process.platform === "win32") {
      const result = spawnSync("taskkill", ["/PID", String(pgid), "/T", "/F"], {
        encoding: "utf8",
      });
      if (result.error) throw result.error;
    } else {
      process.kill(-pgid, signal);
    }
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

async function waitForProcessGroupExit(pgid, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let members = listProcessGroupMembers(pgid);
  while (members.length > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    members = listProcessGroupMembers(pgid);
  }
  return members;
}

function runProcess(
  command,
  args,
  { timeoutMs = 20000, killGraceMs = 1000, ...options } = {},
) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      ...options,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let error;
    let cleanup;
    const timer = setTimeout(() => {
      error = Object.assign(
        new Error(`Command timed out after ${timeoutMs} ms: ${command}`),
        { code: "ETIMEDOUT" },
      );
      stderr += `${error.message}\n`;
      // Marp and Chromium can lead their own groups. Snapshot them before
      // terminating the parent so reparenting cannot hide them from cleanup.
      let descendants = [child.pid];
      try {
        descendants = snapshotDescendants(child.pid);
      } catch (cause) {
        stderr += `${cause.message}\n`;
      }
      const signalAll = (signal) => {
        for (const pid of [...descendants].reverse()) {
          try {
            killProcessGroup(pid, signal);
            if (process.platform !== "win32") process.kill(pid, signal);
          } catch (cause) {
            if (cause.code !== "ESRCH")
              stderr += `Failed to stop ${pid}: ${cause.message}\n`;
          }
        }
      };
      // Finish forced cleanup even if the group leader exits during the grace period.
      cleanup = new Promise((done) => {
        signalAll("SIGTERM");
        setTimeout(() => {
          signalAll("SIGKILL");
          done();
        }, killGraceMs);
      });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (cause) => {
      error = cause;
    });
    child.on("close", async (status, signal) => {
      clearTimeout(timer);
      await cleanup;
      resolve({ status: error ? null : status, signal, stdout, stderr, error });
    });
  });
}

module.exports = {
  killProcessGroup,
  listProcessGroupMembers,
  runProcess,
  waitForProcessGroupExit,
};
