const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");

const repoRoot = path.resolve(__dirname, "../..");

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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-theme-watch-"));
    for (const name of ["bin", "scripts", "src", "themes/src", "designs/lab"]) {
      fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      fs.cpSync(path.join(repoRoot, name), path.join(root, name), {
        recursive: true,
      });
    }
    fs.copyFileSync(
      path.join(repoRoot, ".mise.toml"),
      path.join(root, ".mise.toml"),
    );
    fs.symlinkSync(
      path.join(repoRoot, "node_modules"),
      path.join(root, "node_modules"),
      "dir",
    );
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
      },
    );
    let log = "";
    child.stdout.on("data", (data) => {
      log += data;
    });
    child.stderr.on("data", (data) => {
      log += data;
    });
    try {
      assert.ok(await waitFor(() => log.includes("Done in"), 15000), log);
      for (const color of ["#123ABC", "#ABC123"]) {
        fs.writeFileSync(
          design + ".save",
          original.replace('primary: "#202228"', `primary: "${color}"`),
        );
        fs.renameSync(design + ".save", design);
        assert.ok(
          await waitFor(() =>
            fs
              .readFileSync(tokens, "utf8")
              .toLowerCase()
              .includes(color.toLowerCase()),
          ),
          log,
        );
      }
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);
