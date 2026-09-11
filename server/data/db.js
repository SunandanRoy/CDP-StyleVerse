import { buildSeedData } from './seed.js'
import { BRANDS } from './brands.js'
import { buildDialSettings, applyDialPatch } from '../../shared/dial.js'

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
// Defaults and mutation rules live in shared/dial.js. The ai_tooling_mode/
// hard_limit fields stay read-only (sourced straight from brands.js).
export const dialSettings = buildDialSettings(BRANDS)

export function getDialSettings(brandId) {
  return dialSettings.get(brandId)
}

export function updateDialSettings(brandId, patch) {
  const current = dialSettings.get(brandId)
  if (!current) return null
  const next = applyDialPatch(brandId, current, patch)
  dialSettings.set(brandId, next)
  return next
}
