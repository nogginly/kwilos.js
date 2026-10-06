import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: 'test/browser',
  testMatch: '**/*.e2e.js',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // CHROMIUM_PATH selects a locally installed Chromium instead of Playwright's own
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `node test/browser/serve.js ${PORT}`,
    url: `http://localhost:${PORT}/package.json`,
    reuseExistingServer: !process.env.CI,
  },
})
