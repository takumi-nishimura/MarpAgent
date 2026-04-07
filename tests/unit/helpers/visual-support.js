let cachedSupportCheck;

async function supportsVisualChecks() {
  if (!cachedSupportCheck) {
    cachedSupportCheck = (async () => {
      try {
        const playwright = require("playwright");
        const browser = await playwright.chromium.launch({ headless: true });
        await browser.close();
        return true;
      } catch {
        return false;
      }
    })();
  }

  return cachedSupportCheck;
}

module.exports = {
  supportsVisualChecks,
};
