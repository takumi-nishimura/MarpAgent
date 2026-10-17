const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isBrowserEnvironmentFailure,
} = require("../helpers/browser-environment");
const {
  createVisualSupportCheck,
  supportsVisualChecks,
} = require("./helpers/visual-support");

test("only missing browser launch prerequisites qualify for environment skips", () => {
  for (const message of [
    "browserType.launch: Executable doesn't exist at /cache/chromium/chrome",
    "browserType.launch: Host system is missing dependencies to run browsers.",
    "chrome: error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory",
    "Running as root without --no-sandbox is not supported.",
  ]) {
    assert.equal(isBrowserEnvironmentFailure(message), true, message);
  }
  for (const message of [
    "browserType.launch: Chromium crashed after launch",
    "Playwright assertion failed: slide was not visible",
    "visual-check-failed: TypeError: cannot read property geometry",
    "Error: no-sandbox option was passed to the wrong helper",
    "Cannot find module 'playwright'",
    "spawn marp ENOENT",
  ]) {
    assert.equal(isBrowserEnvironmentFailure(message), false, message);
  }
});

test("visual support caches known environment failures without hiding implementation bugs", async () => {
  let launches = 0;
  const unavailable = createVisualSupportCheck(async () => {
    launches += 1;
    throw new Error(
      "browserType.launch: Executable doesn't exist at /missing/chrome",
    );
  });
  assert.equal(await unavailable(), false);
  assert.equal(await unavailable(), false);
  assert.equal(launches, 1);

  const bug = new TypeError("Chromium launcher returned an invalid handle");
  const broken = createVisualSupportCheck(async () => {
    throw bug;
  });
  await assert.rejects(broken(), (error) => error === bug);
  await assert.rejects(broken(), (error) => error === bug);

  const closeBug = new Error("Playwright close failed");
  const brokenClose = createVisualSupportCheck(async () => ({
    close: async () => {
      throw closeBug;
    },
  }));
  await assert.rejects(brokenClose(), (error) => error === closeBug);
});

test("npm test requires a working Chromium for rendered validation", async () => {
  assert.equal(
    await supportsVisualChecks(),
    true,
    "Chromium is unavailable. Install it with npx playwright install --with-deps chromium. Individual visual tests may skip, but npm test must fail.",
  );
});
