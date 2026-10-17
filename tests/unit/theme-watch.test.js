const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createThemeRepo } = require("./helpers/theme-repo");
const { killProcessGroup } = require("../helpers/process-group");

async function waitFor(predicate, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  return false;
}

test(
  "theme watch regenerates tokens after consecutive atomic saves",
  { timeout: 30000 },
  async () => {
    const root = createThemeRepo();
    const design = path.join(root, "designs/lab/DESIGN.md");
    const original = fs.readFileSync(design, "utf8");
    const tokens = path.join(
      root,
      "themes/src/_generated/lab-design-tokens.css",
    );
    const child = spawn(
      process.execPath,
      [path.join(root, "bin/marpx.js"), "--theme", "lab", "--watch"],
      {
        cwd: root,
        env: {
          ...process.env,
          PATH:
            path.dirname(process.execPath) + path.delimiter + process.env.PATH,
        },
        stdio: ["pipe", "pipe", "pipe"],
        detached: process.platform !== "win32",
      },
    );
    let log = "";
    child.stdout.on("data", (data) => {
      log += data;
    });
    child.stderr.on("data", (data) => {
      log += data;
    });
    let saves = 0;
    const tokenContent = () =>
      fs.existsSync(tokens)
        ? fs.readFileSync(tokens, "utf8")
        : "(missing token file)";
    const diagnostic = (expected) =>
      [
        `Atomic saves: ${saves}; expected primary: ${expected}`,
        `Watcher ready: ${log.includes("Watching designs/lab/DESIGN.md")}; compiler ready: ${log.includes("Done in")}`,
        `Exit: ${child.exitCode}; signal: ${child.signalCode}`,
        `Actual primary: ${tokenContent().match(/--color-primary:[^;]+;/)?.[0] || tokenContent()}`,
        log,
      ].join("\n");
    try {
      assert.ok(
        await waitFor(
          () =>
            log.includes("Watching designs/lab/DESIGN.md") &&
            log.includes("Done in"),
          15000,
        ),
        diagnostic("initial tokens"),
      );
      assert.ok(
        original.includes('primary: "#202228"'),
        "The test must replace the actual primary token.",
      );
      for (const color of ["#123ABC", "#ABC123"]) {
        fs.writeFileSync(
          design + ".save",
          original.replace('primary: "#202228"', `primary: "${color}"`),
        );
        fs.renameSync(design + ".save", design);
        saves += 1;
        assert.ok(
          await waitFor(() =>
            tokenContent()
              .toLowerCase()
              .includes(`--color-primary: ${color.toLowerCase()};`),
          ),
          diagnostic(color),
        );
      }
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        const force = setTimeout(() => killProcessGroup(child.pid), 1500);
        child.kill("SIGTERM");
        await exited;
        clearTimeout(force);
      }
      killProcessGroup(child.pid);
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);
