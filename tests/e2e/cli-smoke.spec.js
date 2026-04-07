const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const marpxBin = path.join(repoRoot, "bin", "marpx.js");

function runMarpx(args) {
  return spawnSync(process.execPath, [marpxBin, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      MARP_AGENT_NO_OPEN: "1",
    },
  });
}

function canSkipForChromiumFailure(stderr) {
  return /browserType\.launch|Playwright|Chromium|no-sandbox|visual-check-failed/i.test(stderr || "");
}

function waitForPattern(stream, pattern, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      stream.off("data", onData);
      reject(new Error(`Timed out waiting for pattern: ${pattern}`));
    }, timeoutMs);

    const onData = (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(pattern);
      if (!match) return;
      clearTimeout(timer);
      stream.off("data", onData);
      resolve(match);
    };

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

test("outline generation smoke", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-e2e-outline-"));
  const outputPath = path.join(tempDir, "outline.md");

  try {
    const result = runMarpx([
      "fixtures/good-brief.md",
      "--outline",
      "--output",
      outputPath,
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(fs.existsSync(outputPath)).toBeTruthy();
    const content = fs.readFileSync(outputPath, "utf8");
    expect(content).toContain("# Outline");
    expect(content).toContain("## Slide Plan");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("screenshot smoke", () => {
  const result = runMarpx(["fixtures/clean-slide.md", "--screenshot", "1"]);

  if (result.status !== 0 && canSkipForChromiumFailure(result.stderr)) {
    test.skip("Chromium is unavailable in this environment.");
    return;
  }

  expect(result.status, result.stderr).toBe(0);

  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  const screenshotPath = lines.at(-1);
  expect(screenshotPath).toBeTruthy();
  expect(fs.existsSync(screenshotPath)).toBeTruthy();
  expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  fs.rmSync(screenshotPath, { force: true });
});

test("overview smoke", async ({ browserName }, testInfo) => {
  if (browserName !== "chromium") {
    test.skip("Smoke test targets chromium only.");
    return;
  }

  const child = spawn(process.execPath, [marpxBin, "fixtures/clean-slide.md", "--overview"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MARP_AGENT_NO_OPEN: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    const match = await waitForPattern(
      child.stdout,
      /\[preview:overview\] Opened (http:\/\/127\.0\.0\.1:\d+[^\s]*)/,
    );
    const overviewUrl = match[1];
    await testInfo.attach("overview-url", {
      contentType: "text/plain",
      body: Buffer.from(overviewUrl, "utf8"),
    });

    const { chromium } = require("playwright");
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } catch {
      test.skip("Chromium is unavailable in this environment.");
      return;
    }

    const page = await browser.newPage();
    await page.goto(overviewUrl, { waitUntil: "networkidle" });
    await expect(page.locator("section[id]").first()).toBeVisible();
    await browser.close();
  } finally {
    await terminateChild(child);
  }
});
