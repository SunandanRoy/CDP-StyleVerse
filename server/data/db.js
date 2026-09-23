import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildDialSettings, applyDialPatch } from '../../shared/dial.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const seed = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'shared', 'sce-seed.json'), 'utf8'))
const ext = JSON.parse(readFileSync(path.join(__dirname, '..', '..', 'shared', 'console-extension.json'), 'utf8'))

// Flat fit_matrix view: [{category, archetype_id, zone, fit_direction}], for
// any UI that wants a row list rather than the nested contract shape.
function flattenFitMatrix(nested) {
  const rows = []
  for (const [category, byArchetype] of Object.entries(nested)) {
    for (const [archetype_id, byZone] of Object.entries(byArchetype)) {
      for (const [zone, fit_direction] of Object.entries(byZone)) {
        rows.push({ category, archetype_id, zone, fit_direction })
      }
    }
  }
  return rows
}

const archetypesById = new Map(seed.archetypes.map((a) => [a.id, a]))

// Legacy nested `fit_passport` shape some UI reads, synthesized from the
// contract's flat measurement fields (§3) rather than a random hash.
function buildFitPassport(c) {
  const archetype = archetypesById.get(c.archetype_id)
  return {
    archetype: archetype?.label || c.archetype_id,
    height_cm: c.height_cm,
    measurements: `${c.bust_in}-${c.waist_in}-${c.hip_in} in (bust-waist-hip)`,
    confidence: c.fit_passport_bridged ? 92 : 78,
    shopping_for: c.id.endsWith('5') || c.id.endsWith('0') ? 'someone else' : 'myself'
  }
}

// D2C-identified customers only (marketplace-only buyers are a separate
// entity with no name/archetype — the C1 fix). `brand_id` is exposed as an
// alias of `brand_affinity` so route handlers can join the same way the v1
// build did. `fit_passport_status` replaces the old "Not yet bridged" copy
// with the contract's "Not applicable (D2C-native)" wording (C1).
const customers = seed.customers.map((c) => ({
  ...c,
  brand_id: c.brand_affinity,
  fit_passport: buildFitPassport(c),
  fit_passport_status: c.fit_passport_bridged ? `Linked · ${c.loyalty_id}` : 'Not applicable (D2C-native)'
}))

export const db = {
  meta: seed.meta,
  brands: seed.brands,
  archetypes: seed.archetypes,
  categories: seed.categories,
  zonesByCategory: seed.zonesByCategory,
  fit_matrix_nested: seed.fitMatrix,
  fit_matrix: flattenFitMatrix(seed.fitMatrix),
  confidence_adjustment_log: seed.confidenceAdjustmentLog,
  products: seed.products,
  outcomeIndex: seed.outcomeIndex,
  customers,
  marketplaceBuyers: seed.marketplaceBuyers,
  orders: seed.orders,
  returns: seed.returns,
  reviews: seed.reviews,
  cases: seed.cases.map((c) => ({ ...c, customer_id: c.customer_id, brand_id: c.brand_id })),
  kpiTable: seed.kpiTable,
  workforce: seed.workforce,
  careerLattice: seed.careerLattice,
  subTeams: seed.subTeams,

  employees: ext.employees,
  capacityTasks: ext.capacityTasks,
  capacitySummary: ext.capacitySummary,
  registryComponents: ext.registryComponents,
  overrideWins: ext.overrideWins,
  certificationHistory: ext.certificationHistory,
  modelRegistry: ext.modelRegistry,
  dialAuditLog: ext.dialAuditLog,

  signal_insights: [] // runtime-only, populated via POST like v1
}

db.productsById = new Map(db.products.map((p) => [p.id, p]))
db.customersById = new Map(db.customers.map((c) => [c.id, c]))
db.ordersById = new Map(db.orders.map((o) => [o.id, o]))
db.brandsById = new Map(db.brands.map((b) => [b.id, b]))
db.archetypesById = new Map(db.archetypes.map((a) => [a.id, a]))
db.marketplaceBuyersByAlias = new Map(db.marketplaceBuyers.map((b) => [b.buyer_alias, b]))

// ---- Module 8: AI Involvement Dial — mutable, per-brand governance
// settings. Defaults/mutation rules live in shared/dial.js; escalation_
// visible / client_facing_generative seed from the v2 brand contract.
export const dialSettings = buildDialSettings(db.brands)

export function getDialSettings(brandId) {
  return dialSettings.get(brandId)
}

// C13 — every Dial change requires a reason and writes an audit entry.
export function updateDialSettings(brandId, patch, reason, changedBy) {
  const current = dialSettings.get(brandId)
  if (!current) return null
  const next = applyDialPatch(brandId, current, patch)
  dialSettings.set(brandId, next)
  const changedKeys = Object.keys(patch).filter((k) => current[k] !== next[k])
  for (const key of changedKeys) {
    db.dialAuditLog.unshift({
      id: `dial_log_rt_${db.dialAuditLog.length + 1}`,
      brand_id: brandId,
      parameter: key,
      before: current[key],
      after: next[key],
      reason: reason || '(no reason given)',
      changed_by: changedBy || 'Console user',
      date: new Date().toISOString().slice(0, 10)
    })
  }
  return next
}

// D4 — closed feedback loop: a Customer Analytics-approved adjustment
// mutates the live fit_matrix (both the nested shape scoreProduct reads and
// the flat row list some UI reads) AND appends to confidence_adjustment_log
// in the same step, so the Confidence Layer recomputes with the new value
// on its very next call — no separate "apply" pass needed.
export function applyFitMatrixAdjustment({ category, archetype_id, zone, new_value, reason, approver }) {
  db.fit_matrix_nested[category] ??= {}
  db.fit_matrix_nested[category][archetype_id] ??= {}
  const old_value = db.fit_matrix_nested[category][archetype_id][zone] || 'true_to_size'
  db.fit_matrix_nested[category][archetype_id][zone] = new_value

  const flatRow = db.fit_matrix.find((r) => r.category === category && r.archetype_id === archetype_id && r.zone === zone)
  if (flatRow) flatRow.fit_direction = new_value
  else db.fit_matrix.push({ category, archetype_id, zone, fit_direction: new_value })

  const entry = {
    id: `adj_${String(db.confidence_adjustment_log.length + 1).padStart(3, '0')}`,
    category, archetype_id, zone, old_value, new_value,
    reason: reason || '(no reason given)',
    date: new Date().toISOString().slice(0, 10),
    approver: approver || 'Customer Analytics'
  }
  db.confidence_adjustment_log.unshift(entry)
  return entry
}
