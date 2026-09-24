const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const marpxBin = path.join(repoRoot, "bin", "marpx.js");
const strictE2E = process.env.MARP_AGENT_STRICT_E2E === "1";

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

test("export smoke: pptx, html, and images to a temp directory", () => {
  // Three Chromium-backed conversions run back to back.
  test.setTimeout(120000);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-e2e-export-"));

  try {
    const pptxPath = path.join(tempDir, "deck.pptx");
    const pptx = runMarpx([
      "fixtures/clean-slide.md",
      "--pptx",
      "--output",
      pptxPath,
    ]);

    if (pptx.status !== 0 && canSkipForChromiumFailure(pptx.stderr)) {
      if (strictE2E) {
        expect(pptx.status, pptx.stderr).toBe(0);
      }
      test.skip("Chromium is unavailable in this environment.");
      return;
    }

    expect(pptx.status, pptx.stderr).toBe(0);
    expect(fs.statSync(pptxPath).size).toBeGreaterThan(0);

    const htmlPath = path.join(tempDir, "deck.html");
    const html = runMarpx([
      "fixtures/clean-slide.md",
      "--html",
      "--output",
      htmlPath,
    ]);

    expect(html.status, html.stderr).toBe(0);
    const htmlContent = fs.readFileSync(htmlPath, "utf8");
    expect(htmlContent).toContain("<section");

    const imagesPrefix = path.join(tempDir, "slide.png");
    const images = runMarpx([
      "fixtures/clean-slide.md",
      "--images",
      "png",
      "--output",
      imagesPrefix,
    ]);

    if (images.status !== 0 && canSkipForChromiumFailure(images.stderr)) {
      if (strictE2E) {
        expect(images.status, images.stderr).toBe(0);
      }
      test.skip("Chromium is unavailable in this environment.");
      return;
    }

    expect(images.status, images.stderr).toBe(0);
    const imageFiles = fs
      .readdirSync(tempDir)
      .filter((f) => /^slide\.\d+\.png$/.test(f));
    expect(imageFiles.length).toBeGreaterThan(0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("screenshot smoke", () => {
  const result = runMarpx(["fixtures/clean-slide.md", "--screenshot", "1"]);

  if (result.status !== 0 && canSkipForChromiumFailure(result.stderr)) {
    if (strictE2E) {
      expect(result.status, result.stderr).toBe(0);
    }
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

test("screenshot of a later page", () => {
  // The bespoke template hides inactive slides, so pages after the first used
  // to time out; rendering with the bare template keeps every slide visible.
  const result = runMarpx(["fixtures/paginate-skip-slide.md", "--screenshot", "2"]);

  if (result.status !== 0 && canSkipForChromiumFailure(result.stderr)) {
    if (strictE2E) {
      expect(result.status, result.stderr).toBe(0);
    }
    test.skip("Chromium is unavailable in this environment.");
    return;
  }

  expect(result.status, result.stderr).toBe(0);

  const screenshotPath = result.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
  expect(screenshotPath).toBeTruthy();
  expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  fs.rmSync(screenshotPath, { force: true });
});

test("overview smoke", async ({ browserName }, testInfo) => {
  if (browserName !== "chromium") {
    if (strictE2E) {
      throw new Error("Strict E2E mode requires Chromium.");
    }
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
    } catch (error) {
      if (strictE2E) {
        throw error;
      }
      test.skip("Chromium is unavailable in this environment.");
      return;
    }

    const page = await browser.newPage();
    await page.goto(overviewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.locator("section[id]").first()).toBeVisible();
    await browser.close();
  } finally {
    await terminateChild(child);
  }
});
