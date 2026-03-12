// Disable Chromium sandbox in sandboxed environments (e.g., Claude Code, CI, Docker).
// Set PLAYWRIGHT_CHROMIUM_SANDBOX=true to opt back in.
const useSandbox = process.env.PLAYWRIGHT_CHROMIUM_SANDBOX === 'true';

module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    viewport: { width: 1280, height: 720 },  // Match slide dimensions
    screenshot: 'only-on-failure',
    launchOptions: {
      args: useSandbox ? [] : ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};
