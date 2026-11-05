const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { unzipSync } = require("fflate");
const {
  runProcess,
  killProcessGroup,
  waitForProcessGroupExit,
} = require("../helpers/process-group");

const repoRoot = path.resolve(__dirname, "../..");
const cli = path.join(repoRoot, "bin/marpx.js");
const svg = (width, fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="60"><rect width="${width}" height="60" fill="${fill}"/></svg>`;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "shared-browser-"));
  const deck = path.join(root, "decks/nested/talk");
  fs.mkdirSync(deck, { recursive: true });
  fs.mkdirSync(path.join(root, "assets"));
  fs.writeFileSync(path.join(root, "assets/logo.svg"), svg(120, "blue"));
  const file = path.join(deck, "slide.md");
  fs.writeFileSync(
    file,
    "---\nmarp: true\ntheme: lab\n---\n## Shared logo\n\n![w:120](shared/logo.svg)\n",
  );
  return { root, deck, file };
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

for (const overview of [false, true]) {
  test(`${overview ? "overview" : "live"} preview resolves shared and reloads changed or materialized resources`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    const f = fixture();
    let output = "";
    const child = spawn(
      process.execPath,
      [cli, f.file, ...(overview ? ["--overview"] : [])],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          MARP_AGENT_NO_OPEN: "1",
          PORT: String(await freePort()),
        },
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    try {
      await expect
        .poll(() => /Opened (http:\/\/\S+)/.exec(output)?.[1], {
          timeout: 25000,
          message: "Preview did not start",
        })
        .toBeTruthy();
      const url = /Opened (http:\/\/\S+)/.exec(output)[1];
      await page.route("https://fonts.googleapis.com/**", (route) =>
        route.abort(),
      );
      await page.addInitScript(() => {
        sessionStorage.sharedReloads = String(
          Number(sessionStorage.sharedReloads || 0) + 1,
        );
      });
      const initialToken = page.waitForResponse((response) =>
        response.url().includes("/__marpagent_shared__/version"),
      );
      await page.goto(url);
      const image = page.locator('img[src="shared/logo.svg"]');
      await expect(image).toHaveJSProperty("naturalWidth", 120);
      await initialToken;
      fs.writeFileSync(path.join(f.root, "assets/logo.svg"), svg(180, "red"));
      await expect(image).toHaveJSProperty("naturalWidth", 180, {
        timeout: 10000,
      });
      await expect
        .poll(() => page.evaluate(() => Number(sessionStorage.sharedReloads)))
        .toBeGreaterThan(1);
      // Wait for the new document's watch baseline before the next independent edit.
      await page.waitForResponse((response) =>
        response.url().includes("/__marpagent_shared__/version"),
      );
      fs.mkdirSync(path.join(f.deck, "shared"));
      fs.writeFileSync(path.join(f.deck, "shared/logo.svg"), svg(240, "green"));
      await expect(image).toHaveJSProperty("naturalWidth", 240, {
        timeout: 10000,
      });
    } finally {
      try {
        await page.goto("about:blank");
      } catch {
        /* Cleanup must also run after a browser timeout. */
      }
      killProcessGroup(child.pid);
      const leftovers = await waitForProcessGroupExit(child.pid);
      fs.rmSync(f.root, { recursive: true, force: true });
      expect(leftovers, output).toEqual([]);
    }
  });
}

test("strict rendering, PDF and portable ZIP use shared without a filesystem link", async () => {
  test.setTimeout(90000);
  const f = fixture();
  const run = (args) =>
    runProcess(process.execPath, [cli, f.file, ...args], {
      cwd: repoRoot,
      env: process.env,
    });
  try {
    const validation = await run(["-v", "--strict"]);
    expect(validation.status, validation.stderr + validation.stdout).toBe(0);
    expect(validation.stdout).toContain("Visual check: measured");
    const pdf = path.join(f.root, "out.pdf");
    const pdfResult = await run(["--pdf", "--output", pdf]);
    expect(pdfResult.status, pdfResult.stderr).toBe(0);
    expect(fs.readFileSync(pdf).subarray(0, 5).toString()).toBe("%PDF-");
    const zip = path.join(f.root, "out.zip");
    const zipResult = await run([
      "--zip",
      "--bundle-root",
      f.root,
      "--output",
      zip,
    ]);
    expect(zipResult.status, zipResult.stderr).toBe(0);
    const files = unzipSync(fs.readFileSync(zip));
    const manifest = JSON.parse(Buffer.from(files["manifest.json"]).toString());
    expect(manifest.errors).toEqual([]);
    expect(
      manifest.files.some((file) => file.source === "assets/logo.svg"),
    ).toBe(true);
    expect(fs.existsSync(path.join(f.deck, "shared"))).toBe(false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
