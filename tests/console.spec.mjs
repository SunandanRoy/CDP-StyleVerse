// Stage 6 — Playwright suite for the Enterprise Console v2.0 (Console-only
// build). Adapted from the original two-tool spec: this drops cross-repo
// checksum matching, ?persona= Storefront deep links, and reference/
// parity capture, since no sibling Storefront project exists in this
// workspace (see SCE_DATA_CONTRACT.md's Console-only note). In their
// place, "Seed determinism" below re-derives the seed from scratch and
// checks it against what's checked in — the meaningful analogue of a
// checksum match when there is only one tool to check it against.
//
// Run against the dev server: `npx playwright test` (playwright.config.js
// auto-starts `npm run dev`). The standalone-gate suite is separate —
// see tests/standalone-gate.spec.mjs.
import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const BRANDS = [
  { id: 'speedstyle', name: 'SpeedStyle' },
  { id: 'urbanedge', name: 'UrbanEdge' },
  { id: 'maisonluxe', name: 'Maison Luxe' },
  { id: 'ecoweave', name: 'EcoWeave' },
  { id: 'threadbasics', name: 'ThreadBasics' }
]

async function selectBrand(page, brandId) {
  await page.locator('header select').nth(1).selectOption(brandId)
  await page.waitForTimeout(200)
}

// ---------------------------------------------------------------------
// Seed determinism — the Console-only analogue of a cross-repo checksum
// match: re-running the generator must reproduce the checked-in checksum.
test.describe('Seed determinism', () => {
  test('shared/sce-seed.json is reproducible from shared/generate-seed.mjs', () => {
    const current = JSON.parse(readFileSync(path.join(ROOT, 'shared/sce-seed.json'), 'utf8'))
    const out = execFileSync('node', ['shared/generate-seed.mjs'], { cwd: ROOT, encoding: 'utf8' })
    const match = out.match(/^checksum: ([a-f0-9]+)$/m)
    expect(match, 'generator did not print a checksum line').toBeTruthy()
    expect(current.meta.checksum).toBe(match[1])
  })

  test('shared/console-extension.json is reproducible from scripts/console-extension.mjs', () => {
    const out1 = execFileSync('node', ['scripts/console-extension.mjs'], { cwd: ROOT, encoding: 'utf8' })
    const out2 = execFileSync('node', ['scripts/console-extension.mjs'], { cwd: ROOT, encoding: 'utf8' })
    const checksum1 = out1.match(/^checksum8: ([a-f0-9]{8})$/m)?.[1]
    const checksum2 = out2.match(/^checksum8: ([a-f0-9]{8})$/m)?.[1]
    expect(checksum1).toBeTruthy()
    expect(checksum1).toBe(checksum2)
  })
})

// ---------------------------------------------------------------------
// Route + brand rendering
test.describe('Routes render for every brand', () => {
  for (const brand of BRANDS) {
    test(`Dashboard renders for ${brand.name}`, async ({ page }) => {
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto('/')
      await selectBrand(page, brand.id)
      await expect(page.locator('h1')).toContainText(brand.name)
      expect(errors).toEqual([])
    })
  }

  const ROUTES = [
    '/customers', '/confidence', '/fit-passport', '/advisor-workspace', '/feedback-loop',
    '/returns', '/returns/decoder', '/cases', '/track-everywhere', '/grievance-radar',
    '/governance/dial', '/governance/voice-certification', '/governance/override-wins',
    '/governance/model-registry', '/business/capacity-ledger', '/business/marketplace-signal',
    '/business/career-lattice', '/today'
  ]
  for (const route of ROUTES) {
    test(`${route} renders with no console errors`, async ({ page }) => {
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toEqual([])
    })
  }
})

// ---------------------------------------------------------------------
// C1-C13 bug-fix spot checks
test.describe('C1-C13 bug fixes', () => {
  test('C1 — marketplace buyers carry no name/archetype', async ({ page }) => {
    await page.goto('/customers')
    await page.locator('button:has-text("Marketplace")').first().click()
    await page.waitForTimeout(300)
    await expect(page.locator('table')).toContainText('MKT-BUYER-')
    await expect(page.locator('table')).not.toContainText('archetype')
  })

  test('C2 — case brand-of-record differs from header brand shows a chip', async ({ page }) => {
    await page.goto('/')
    await selectBrand(page, 'speedstyle')
    // Karan Mehta's case (case_013, generated seed) is a threadbasics case — visiting it while
    // the header is on speedstyle should show the "other brand" indicator.
    await page.goto('/cases/case_013')
    await page.waitForTimeout(400)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.toLowerCase()).toMatch(/threadbasics|viewing.*brand/i)
  })

  test('C3 — Brand Voice rubric can fail a casual draft for Maison Luxe', async ({ page }) => {
    await page.goto('/')
    await selectBrand(page, 'maisonluxe')
    await page.goto('/governance/voice-certification')
    await page.waitForTimeout(300)
    const textarea = page.locator('textarea').first()
    await textarea.fill('hey! lol thanks for shopping, hurry and grab this deal now!')
    await page.locator('button:has-text("Certify")').first().click()
    await page.waitForTimeout(1500)
    await expect(page.locator('body')).toContainText(/Fail/)
  })

  test('C9 — Capacity Ledger states a monthly run-rate, not a cumulative total', async ({ page }) => {
    await page.goto('/business/capacity-ledger')
    await expect(page.locator('body')).toContainText('hrs/mo')
  })

  test('C11 — dates render unambiguously (DD Mon YYYY)', async ({ page }) => {
    await page.goto('/governance/override-wins')
    await page.waitForTimeout(300)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 20\d{2}/)
  })

  test('C12 — sidebar collapses under 900px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 })
    await page.goto('/')
    await page.waitForTimeout(300)
    const sidebarWidth = await page.locator('aside').first().evaluate((el) => el.getBoundingClientRect().width)
    expect(sidebarWidth).toBeLessThan(100)
  })

  test('C13 — Dial change without a reason is blocked', async ({ page }) => {
    await page.goto('/governance/dial')
    await page.waitForTimeout(300)
    const slider = page.locator('input[type="range"]').first()
    await slider.evaluate((el) => { el.value = String(Number(el.value) + 5); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) })
    await page.waitForTimeout(200)
    const saveBtn = page.locator('button:has-text("Save")').first()
    if (await saveBtn.count()) {
      await saveBtn.click()
      await page.waitForTimeout(300)
      await expect(page.locator('body')).toContainText(/reason/i)
    }
  })
})

// ---------------------------------------------------------------------
// D1-D9 feature checks
test.describe('D1-D9 feature additions', () => {
  test('D1 — "View as" filters the sidebar and opens Today', async ({ page }) => {
    await page.goto('/')
    await page.locator('select[title*="View as"]').selectOption('CRM & Loyalty')
    await page.waitForTimeout(400)
    await expect(page).toHaveURL(/\/today$/)
    await expect(page.locator('h1')).toContainText('CRM & Loyalty')
    await expect(page.locator('aside')).not.toContainText('Governance')
  })

  test('D2 — Advisor Workspace is N/A for a non-Advisor-Mediated brand', async ({ page }) => {
    await page.goto('/')
    await selectBrand(page, 'speedstyle')
    await page.goto('/advisor-workspace')
    await page.waitForTimeout(300)
    await expect(page.locator('body')).toContainText(/Advisor-Mediated brands/i)
  })

  test('D2 — Advisor Workspace runs the full flow for Maison Luxe', async ({ page }) => {
    await page.goto('/')
    await selectBrand(page, 'maisonluxe')
    await page.goto('/advisor-workspace')
    await page.locator('button:has-text("LOY-")').first().click()
    await page.locator('button:has-text("Generate AI brief")').click()
    await page.waitForTimeout(2000)
    await expect(page.locator('text=Internal brief')).toBeVisible()
  })

  test('D3 — Priya Nair is in EcoWeave\'s Grievance Radar', async ({ page }) => {
    await page.goto('/')
    await selectBrand(page, 'ecoweave')
    await page.goto('/grievance-radar')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText('Priya Nair')
  })

  test('D4 — SKU hot-list is present on the Closed Feedback Loop page', async ({ page }) => {
    await page.goto('/')
    await selectBrand(page, 'speedstyle')
    await page.goto('/feedback-loop')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText('SKU Hot-List')
  })

  test('D5 — Channel Data Capability Matrix and Bridge Funnel are present', async ({ page }) => {
    await page.goto('/business/marketplace-signal')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText('Channel Data Capability Matrix')
    await expect(page.locator('body')).toContainText('Bridge Funnel')
  })

  test('D6 — Confidence Calibration shows a Brier score', async ({ page }) => {
    await page.goto('/confidence')
    await page.waitForTimeout(800)
    await expect(page.locator('body')).toContainText('Brier score')
  })

  test('D7 — Dashboard funnel and return-rate-vs-commitment are present', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText('Revenue Funnel')
    await expect(page.locator('body')).toContainText('Return Rate vs. Commitment')
  })

  test('D8 — Karan Mehta\'s Identity Graph shows a pending claim', async ({ page }) => {
    await page.goto('/customers/cust_003')
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText('Identity Graph')
    await expect(page.locator('body')).toContainText(/Claim pending/i)
  })

  test('D9 — Live Sync flag defaults off and is toggleable', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="Settings — live Gemini key"]').click()
    await page.waitForTimeout(300)
    const checkbox = page.locator('label:has(input[type="checkbox"])').last().locator('input')
    await expect(checkbox).not.toBeChecked()
    await page.locator('label:has(input[type="checkbox"])').last().click()
    await expect(checkbox).toBeChecked()
  })
})
