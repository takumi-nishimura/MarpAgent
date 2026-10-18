const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  findInstalledBrowser,
  getPlaywrightChromiumPath,
  marpBrowserArgs,
} = require("../../src/marp-browser");

const repoRoot = path.join(__dirname, "../..");
const noWhich = () => null;
const nothingExists = () => false;

function detect(overrides) {
  return findInstalledBrowser({
    env: {},
    exists: nothingExists,
    which: noWhich,
    homedir: "/home/test",
    ...overrides,
  });
}

test("findInstalledBrowser honors CHROME_PATH when the file exists", () => {
  const found = detect({
    platform: "linux",
    env: { CHROME_PATH: "/opt/custom/chrome" },
    exists: (p) => p === "/opt/custom/chrome",
  });

  assert.equal(found, "/opt/custom/chrome");
});

test("findInstalledBrowser ignores a CHROME_PATH that does not exist", () => {
  const found = detect({
    platform: "linux",
    env: { CHROME_PATH: "/missing/chrome" },
    exists: nothingExists,
  });

  assert.equal(found, null);
});

test("findInstalledBrowser finds Chrome on macOS", () => {
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const found = detect({
    platform: "darwin",
    exists: (p) => p === chrome,
  });

  assert.equal(found, chrome);
});

test("findInstalledBrowser finds Edge on macOS", () => {
  const edge = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
  const found = detect({
    platform: "darwin",
    exists: (p) => p === edge,
  });

  assert.equal(found, edge);
});

test("findInstalledBrowser finds Chrome on Linux via PATH", () => {
  const found = detect({
    platform: "linux",
    which: (cmd) => (cmd === "google-chrome" ? "/usr/bin/google-chrome" : null),
    exists: (p) => p === "/usr/bin/google-chrome",
  });

  assert.equal(found, "/usr/bin/google-chrome");
});

test("findInstalledBrowser finds Edge on Linux at its fixed path", () => {
  const found = detect({
    platform: "linux",
    exists: (p) => p === "/opt/microsoft/msedge/msedge",
  });

  assert.equal(found, "/opt/microsoft/msedge/msedge");
});

test("findInstalledBrowser finds Chrome on Windows", () => {
  const chrome = path.join(
    "C:\\Program Files",
    "Google",
    "Chrome",
    "Application",
    "chrome.exe",
  );
  const found = detect({
    platform: "win32",
    env: { PROGRAMFILES: "C:\\Program Files" },
    exists: (p) => p === chrome,
  });

  assert.equal(found, chrome);
});

test("findInstalledBrowser returns null when no browser is installed", () => {
  assert.equal(detect({ platform: "linux" }), null);
  assert.equal(detect({ platform: "darwin" }), null);
  assert.equal(detect({ platform: "win32", env: {} }), null);
});

test("marpBrowserArgs lets Marp detect an installed browser itself", () => {
  const args = marpBrowserArgs({
    repoRoot,
    playwrightChromiumPath: () => "/pw/chromium",
    env: {},
    platform: "darwin",
    exists: (p) =>
      p === "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    which: noWhich,
  });

  assert.deepEqual(args, []);
});

test(
  "Marp ignores missing browser environment paths when selecting an installed browser",
  { skip: process.platform !== "linux" },
  (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-browser-env-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const candidate = path.join(root, "google-chrome-stable");
    const marker = path.join(root, "browser-started");
    const preload = path.join(root, "capture-browser.cjs");
    fs.writeFileSync(
      candidate,
      `#!/usr/bin/env node
    process.exit(1);
  `,
      { mode: 0o755 },
    );
    fs.writeFileSync(
      preload,
      `const childProcess = require("node:child_process");
const { spawn } = childProcess;
childProcess.spawn = function (command, args, options) {
  if (args?.some((arg) => arg.startsWith("--remote-debugging-"))) {
    require("node:fs").writeFileSync(${JSON.stringify(marker)}, command);
    return spawn(process.execPath, ["-e", "process.exit(1)"], options);
  }
  return spawn(command, args, options);
};
require("node:module").syncBuiltinESMExports();
`,
    );
    const env = {
      ...process.env,
      CHROME_PATH: path.join(root, "missing-chrome"),
      LIGHTHOUSE_CHROMIUM_PATH: path.join(root, "missing-lighthouse"),
      PATH: `${root}${path.delimiter}${process.env.PATH}`,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require ${JSON.stringify(preload)}`,
    };
    assert.deepEqual(
      marpBrowserArgs({
        repoRoot,
        env,
        platform: "linux",
        which: (command) =>
          command === "google-chrome-stable" ? candidate : null,
      }),
      [],
    );

    const result = spawnSync(
      process.execPath,
      [
        "bin/marpx.js",
        "fixtures/clean-slide.md",
        "--images",
        "png",
        "--output",
        path.join(root, "slide.png"),
      ],
      { cwd: repoRoot, env, encoding: "utf8", timeout: 10000 },
    );
    assert.equal(result.error, undefined, result.error?.message);
    // Stop at the browser launch boundary: a desktop-installed Chrome may
    // outrank the PATH stand-in, but either must be a real executable.
    assert.equal(result.status, 1, result.stderr);
    const selected = fs.readFileSync(marker, "utf8");
    assert.notEqual(selected, env.CHROME_PATH);
    assert.notEqual(selected, env.LIGHTHOUSE_CHROMIUM_PATH);
    assert.ok(
      fs.existsSync(selected),
      `Selected browser does not exist: ${selected}`,
    );
  },
);

test("marpBrowserArgs pins the Playwright Chromium fallback", () => {
  const args = marpBrowserArgs({
    repoRoot,
    playwrightChromiumPath: () => "/pw/chromium",
    env: {},
    platform: "linux",
    exists: (candidate) => candidate === "/pw/chromium",
    which: noWhich,
  });

  assert.deepEqual(args, ["--browser-path", "/pw/chromium"]);
});

test("browser fallback skips a removed headless shell", () => {
  assert.equal(
    getPlaywrightChromiumPath(repoRoot, {
      candidates: ["/removed/shell", "/installed/chromium"],
      exists: (candidate) => candidate === "/installed/chromium",
    }),
    "/installed/chromium",
  );
});

test("browser selection diagnoses missing fallback paths", () => {
  assert.throws(
    () =>
      marpBrowserArgs({
        repoRoot,
        env: {},
        exists: nothingExists,
        which: noWhich,
        playwrightChromiumPath: () => "/removed/chromium",
      }),
    /\/removed\/chromium[\s\S]*playwright install chromium/,
  );
});

test("marpx export aborts with a clear error when the conversion stalls", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-timeout-"));

  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(repoRoot, "bin", "marpx.js"),
        "fixtures/clean-slide.md",
        "--html",
        "-o",
        path.join(tempDir, "out.html"),
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 30000,
        env: {
          ...process.env,
          // Too short for the marp child to even start converting.
          MARP_AGENT_CONVERT_TIMEOUT_MS: "150",
        },
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /did not finish within|stalled/i);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("marpx html export succeeds within the default timeout", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-export-"));

  try {
    const outputPath = path.join(tempDir, "out.html");
    const result = spawnSync(
      process.execPath,
      [
        path.join(repoRoot, "bin", "marpx.js"),
        "fixtures/clean-slide.md",
        "--html",
        "-o",
        outputPath,
      ],
      { cwd: repoRoot, encoding: "utf8", timeout: 60000 },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(outputPath));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
