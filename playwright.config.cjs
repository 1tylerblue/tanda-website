const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser', timeout: 60000, workers: 2, reporter: 'list',
  outputDir: 'output/browser-results',
  use: { baseURL: 'http://127.0.0.1:4191', channel: 'chrome', headless: true },
  webServer: { command: 'node scripts/preview-pricing.cjs', url: 'http://127.0.0.1:4191', reuseExistingServer: true }
});
