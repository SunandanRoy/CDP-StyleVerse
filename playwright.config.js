import { defineConfig, devices } from '@playwright/test'

// Pre-installed Chromium in this environment — do not let Playwright try to
// download its own browser build.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/standalone-gate.spec.mjs', // separate config — see playwright.standalone.config.js
  timeout: 30000,
  fullyParallel: false, // shared dev-server DB state (dial audits, fit-matrix, override wins) — tests must not race each other
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000
  }
})
