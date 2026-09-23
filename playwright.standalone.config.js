import { defineConfig, devices } from '@playwright/test'

// Standalone-gate config: no dev server needed — the spec opens the built
// artifact directly via file://. Kept separate from playwright.config.js
// so the two suites' very different setups (dev server vs. isolated temp
// dir + network lockdown) never bleed into each other.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/standalone-gate.spec.mjs',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath, args: ['--allow-file-access-from-files'] } }
    }
  ]
})
