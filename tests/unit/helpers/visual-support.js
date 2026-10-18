const {
  isBrowserEnvironmentFailure,
} = require("../../helpers/browser-environment");

function createVisualSupportCheck(
  launch = () => require("playwright").chromium.launch({ headless: true }),
) {
  let cachedSupportCheck;
  return async function supportsVisualChecks() {
    if (!cachedSupportCheck) {
      cachedSupportCheck = (async () => {
        let browser;
        try {
          browser = await launch();
        } catch (error) {
          if (!isBrowserEnvironmentFailure(error)) throw error;
          return false;
        }
        await browser.close();
        return true;
      })();
    }
    return cachedSupportCheck;
  };
}

module.exports = {
  createVisualSupportCheck,
  supportsVisualChecks: createVisualSupportCheck(),
};
