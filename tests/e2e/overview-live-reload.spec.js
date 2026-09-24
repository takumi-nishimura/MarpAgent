const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const marpxBin = path.join(repoRoot, "bin", "marpx.js");

// Test list:
// - Reload from the HTTP metadata token.
// - Reload again after the first automatic reload.
// - Exercise the same behavior in Chromium and Firefox.
// - Navigate only after the overview reports that it is ready.

function writeDeck(deckPath, state) {
  fs.writeFileSync(
    deckPath,
    [
      "---",
      "marp: true",
      "theme: lab",
      "---",
      "",
      "# Overview live reload",
      "",
      `State: ${state}`,
      "",
    ].join("\n"),
  );
}

// Collect the child's output for the whole test: draining both pipes keeps
// the server from blocking on a full pipe, and the log explains failures.
function collectOutput(child) {
  const output = { text: "" };
  const append = (chunk) => {
    output.text += chunk.toString();
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  return output;
}

// The overview prints this line only after its server is listening, its
// file watchers are active, and the first render has been published, so it
// is the readiness signal for navigating and saving.
function waitForOverviewUrl(child, output, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const timer = setInterval(() => {
      const match = output.text.match(
        /\[preview:overview\] Opened (http:\/\/127\.0\.0\.1:\d+[^\s]*)/,
      );
      if (match) {
        clearInterval(timer);
        resolve(match[1]);
      } else if (child.exitCode !== null || child.signalCode !== null) {
        clearInterval(timer);
        reject(new Error(`Overview exited before it was ready:\n${output.text}`));
      } else if (Date.now() > deadline) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for overview URL:\n${output.text}`));
      }
    }, 25);
  });
}

function isProcessGroupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

// marpx runs the overview server as its own child, so signal the whole
// process group; otherwise the server outlives the test.
async function terminateProcessGroup(child) {
  if (!isProcessGroupAlive(child.pid)) return;
  process.kill(-child.pid, "SIGTERM");
  const deadline = Date.now() + 5000;
  while (isProcessGroupAlive(child.pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (isProcessGroupAlive(child.pid)) process.kill(-child.pid, "SIGKILL");
}

test("overview follows consecutive saves in every supported browser", async ({
  page,
}, testInfo) => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "marpx-overview-reload-"),
  );
  const deckPath = path.join(tempDir, "slide.md");
  writeDeck(deckPath, "initial");

  const child = spawn(process.execPath, [marpxBin, deckPath, "--overview"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MARP_AGENT_NO_OPEN: "1",
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = collectOutput(child);

  try {
    const overviewUrl = await waitForOverviewUrl(child, output);
    await testInfo.attach("overview-url", {
      contentType: "text/plain",
      body: Buffer.from(overviewUrl, "utf8"),
    });

    await page.goto(overviewUrl, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("State: initial", { exact: true }),
    ).toBeVisible();

    writeDeck(deckPath, "save-1");
    await expect(page.getByText("State: save-1", { exact: true })).toBeVisible({
      timeout: 2500,
    });

    writeDeck(deckPath, "save-2");
    await expect(page.getByText("State: save-2", { exact: true })).toBeVisible({
      timeout: 2500,
    });
  } finally {
    await terminateProcessGroup(child);
    await testInfo.attach("overview-log", {
      contentType: "text/plain",
      body: Buffer.from(output.text, "utf8"),
    });
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
