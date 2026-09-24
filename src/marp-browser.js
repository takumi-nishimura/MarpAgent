const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

// Candidate locations for an installed browser, mirroring the finders bundled
// in @marp-team/marp-cli. When one of these exists, marpx omits
// --browser-path and lets marp-cli pick the browser itself: some Playwright
// "Chrome for Testing" builds stall during conversion on macOS (ISS-0029).
const LINUX_BROWSER_COMMANDS = [
  "google-chrome-stable",
  "google-chrome",
  "chromium-browser",
  "chromium",
];

const LINUX_BROWSER_PATHS = [
  "/opt/google/chrome/chrome",
  "/opt/microsoft/msedge/msedge",
  "/opt/microsoft/msedge-beta/msedge",
  "/opt/microsoft/msedge-dev/msedge",
];

const DARWIN_BROWSER_APPS = [
  ["Google Chrome.app", "Google Chrome"],
  ["Google Chrome Canary.app", "Google Chrome Canary"],
  ["Microsoft Edge.app", "Microsoft Edge"],
  ["Microsoft Edge Beta.app", "Microsoft Edge Beta"],
  ["Microsoft Edge Dev.app", "Microsoft Edge Dev"],
  ["Microsoft Edge Canary.app", "Microsoft Edge Canary"],
];

const WIN32_BROWSER_BINS = [
  ["Google", "Chrome", "Application", "chrome.exe"],
  ["Microsoft", "Edge", "Application", "msedge.exe"],
];

function darwinBrowserPaths(homedir) {
  const paths = [];
  for (const root of ["/Applications", path.join(homedir, "Applications")]) {
    for (const [app, bin] of DARWIN_BROWSER_APPS) {
      paths.push(path.join(root, app, "Contents", "MacOS", bin));
    }
  }
  return paths;
}

function win32BrowserPaths(env) {
  const roots = [
    env.LOCALAPPDATA,
    env.PROGRAMFILES,
    env["PROGRAMFILES(X86)"],
    env.PROGRAMW6432,
  ].filter(Boolean);
  const paths = [];
  for (const root of roots) {
    for (const rel of WIN32_BROWSER_BINS) {
      paths.push(path.join(root, ...rel));
    }
  }
  return paths;
}

function which(command) {
  try {
    const found = execFileSync("which", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")[0]
      .trim();
    return found || null;
  } catch {
    return null;
  }
}

// Returns the path of a browser marp-cli can find on its own (CHROME_PATH,
// LIGHTHOUSE_CHROMIUM_PATH, or an installed Chrome/Edge/Chromium), or null.
function findInstalledBrowser({
  platform = process.platform,
  env = process.env,
  homedir = os.homedir(),
  exists = fs.existsSync,
  which: whichFn = which,
} = {}) {
  for (const envVar of ["CHROME_PATH", "LIGHTHOUSE_CHROMIUM_PATH"]) {
    const configured = env[envVar];
    if (configured && exists(configured)) return configured;
  }

  if (platform === "darwin") {
    for (const candidate of darwinBrowserPaths(homedir)) {
      if (exists(candidate)) return candidate;
    }
  } else if (platform === "win32") {
    for (const candidate of win32BrowserPaths(env)) {
      if (exists(candidate)) return candidate;
    }
  } else {
    for (const command of LINUX_BROWSER_COMMANDS) {
      const resolved = whichFn(command);
      if (resolved && exists(resolved)) return resolved;
    }
    for (const candidate of LINUX_BROWSER_PATHS) {
      if (exists(candidate)) return candidate;
    }
  }

  return null;
}

// The headless shell build does not hit the Chrome for Testing stall, so it
// is preferred over the full browser binary when resolvable.
function getPlaywrightChromiumPath(repoRoot) {
  const script = [
    "let found;",
    "try {",
    '  const { registry } = require("playwright-core/lib/server/registry/index");',
    '  const shell = registry.findExecutable("chromium-headless-shell");',
    "  if (shell) found = shell.executablePath();",
    "} catch {}",
    "if (!found) found = require(\"playwright\").chromium.executablePath();",
    "process.stdout.write(found);",
  ].join("\n");

  try {
    return execFileSync(process.execPath, ["-e", script], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
  } catch (error) {
    throw new Error(
      "No installed Chrome or Edge was found, and the Playwright Chromium " +
        `fallback is unavailable: ${error.message}`,
    );
  }
}

// Returns the CLI args pinning a browser for marp-cli: [] when Marp can find
// an installed browser itself, or --browser-path aimed at Playwright's
// Chromium as the fallback.
function marpBrowserArgs({
  repoRoot = path.resolve(__dirname, ".."),
  playwrightChromiumPath = getPlaywrightChromiumPath,
  ...detectOptions
} = {}) {
  if (findInstalledBrowser(detectOptions)) return [];
  return ["--browser-path", playwrightChromiumPath(repoRoot)];
}

module.exports = {
  findInstalledBrowser,
  getPlaywrightChromiumPath,
  marpBrowserArgs,
};
