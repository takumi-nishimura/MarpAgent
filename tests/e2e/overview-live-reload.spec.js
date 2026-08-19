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

function waitForOverviewUrl(stream, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      stream.off("data", onData);
      reject(new Error("Timed out waiting for overview URL"));
    }, timeoutMs);

    function onData(chunk) {
      buffer += chunk.toString();
      const match = buffer.match(
        /\[preview:overview\] Opened (http:\/\/127\.0\.0\.1:\d+[^\s]*)/,
      );
      if (!match) return;
      clearTimeout(timer);
      stream.off("data", onData);
      resolve(match[1]);
    }

    stream.on("data", onData);
  });
}

async function terminateChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
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
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    const overviewUrl = await waitForOverviewUrl(child.stdout);
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
    await terminateChild(child);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
