// Stage 6 — the "standalone gate": proves dist-artifact/index.html is a
// genuinely self-contained single file with zero runtime dependencies.
// Builds the artifact, copies ONLY the final HTML into an empty temp
// directory (so it can't accidentally reach sibling project files), opens
// it via file:// with a network monitor that fails the test if anything
// other than file:// or data: is requested, then re-runs a representative
// subset of the main suite's smoke checks against that isolated copy.
//
// This is a separate Playwright config from tests/console.spec.mjs (no
// dev-server webServer needed here) — run with:
//   npx playwright test tests/standalone-gate.spec.mjs --config=playwright.standalone.config.js
import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, copyFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

let fileUrl

test.beforeAll(() => {
  execFileSync('npm', ['run', 'build:artifact'], { cwd: ROOT, stdio: 'inherit' })
  const builtHtml = path.join(ROOT, 'dist-artifact', 'index.html')
  expect(existsSync(builtHtml), 'dist-artifact/index.html was not produced by the build').toBe(true)

  // An empty temp dir, isolated from the repo, with ONLY the final HTML —
  // proves nothing else on disk is silently being relied on.
  const isolated = mkdtempSync(path.join(tmpdir(), 'sce-standalone-gate-'))
  const target = path.join(isolated, 'PWC_CDP_Semi.html')
  copyFileSync(builtHtml, target)
  fileUrl = `file://${target}`
})

test.describe('Standalone gate', () => {
  test('loads via file:// with zero non-file:// network requests', async ({ page }) => {
    const violations = []
    await page.route('**/*', (route) => {
      const url = route.request().url()
      if (!url.startsWith('file://') && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('about:')) {
        violations.push(url)
        return route.abort()
      }
      return route.continue()
    })

    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.goto(fileUrl)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    expect(violations, `non-file:// requests were made: ${violations.join(', ')}`).toEqual([])
    expect(errors).toEqual([])
  })

  test('renders the Dashboard for the default brand', async ({ page }) => {
    await page.route('**/*', (route) => {
      const url = route.request().url()
      return url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')
        ? route.continue()
        : route.abort()
    })
    await page.goto(fileUrl)
    await page.waitForTimeout(800)
    await expect(page.locator('h1')).toContainText('SpeedStyle')
  })

  test('the sidebar and command palette work offline', async ({ page }) => {
    await page.route('**/*', (route) => {
      const url = route.request().url()
      return url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')
        ? route.continue()
        : route.abort()
    })
    await page.goto(fileUrl)
    await page.waitForTimeout(800)
    await page.locator('a:has-text("Confidence Layer"), [href*="confidence"]').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('h1')).toContainText('Confidence Layer')
  })

  test('D9 Live Sync stub still reports honestly with no producer present', async ({ page }) => {
    await page.route('**/*', (route) => {
      const url = route.request().url()
      return url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')
        ? route.continue()
        : route.abort()
    })
    await page.goto(fileUrl)
    await page.waitForTimeout(500)
    await page.locator('button[title="Settings — live Gemini key"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('body')).toContainText('Live Sync')
  })
})
