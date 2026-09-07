import { buildSeedData } from './seed.js'
import { BRANDS } from './brands.js'

const seed = buildSeedData()

export const db = {
  ...seed,
  productsById: new Map(seed.products.map((p) => [p.id, p])),
  customersById: new Map(seed.customers.map((c) => [c.id, c])),
  ordersById: new Map(seed.orders.map((o) => [o.id, o])),
  brandsById: new Map(seed.brands.map((b) => [b.id, b])),
  archetypesById: new Map(seed.archetypes.map((a) => [a.id, a]))
}

// ---- Module 8: AI Involvement Dial — mutable, per-brand governance settings.
// Seed defaults per brand posture; the ai_tooling_mode/hard_limit fields stay
// read-only (sourced straight from brands.js), only the rest are adjustable.
const DIAL_DEFAULTS = {
  speedstyle: { automation_frequency: 85, tone: 'Energetic', proactivity_threshold: 70, escalation_threshold: 80 },
  urbanedge: { automation_frequency: 55, tone: 'Professional', proactivity_threshold: 50, escalation_threshold: 60 },
  maisonluxe: { automation_frequency: 20, tone: 'Warm & Refined', proactivity_threshold: 30, escalation_threshold: 20 },
  ecoweave: { automation_frequency: 40, tone: 'Warm & Honest', proactivity_threshold: 55, escalation_threshold: 65 },
  threadbasics: { automation_frequency: 90, tone: 'Straightforward', proactivity_threshold: 75, escalation_threshold: 85 }
}

export const dialSettings = new Map(
  BRANDS.map((b) => [
    b.id,
    {
      brand_id: b.id,
      ...DIAL_DEFAULTS[b.id],
      disclosure_mode: b.disclosure_mode // 'Advisor-Mediated' | 'Self-Directed', toggleable
    }
  ])
)

export function getDialSettings(brandId) {
  return dialSettings.get(brandId)
}

export function updateDialSettings(brandId, patch) {
  const current = dialSettings.get(brandId)
  if (!current) return null
  const allowedKeys = ['automation_frequency', 'tone', 'proactivity_threshold', 'escalation_threshold', 'disclosure_mode']
  const next = { ...current }
  for (const key of allowedKeys) {
    if (patch[key] !== undefined) next[key] = patch[key]
  }
  dialSettings.set(brandId, next)
  return next
}
