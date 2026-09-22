// SCE_DATA_CONTRACT.md §6 — pure scoring functions. Same source used by the
// seed generator (to compute seeded confidence figures) and the running app
// (to recompute live after a Dial or fit-matrix change). No hashing, no
// randomness — every function here is a deterministic function of its inputs.
import { computeConfidenceScore } from './confidence.js'
import { DOMINANT_ZONE, APPAREL_SIZE_RUN, FOOTWEAR_SIZE_RUN } from './contract-constants.mjs'

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

export function offZoneCount(fitMatrixRow) {
  if (!fitMatrixRow) return 0
  return Object.values(fitMatrixRow).filter((v) => v !== 'true_to_size').length
}

/** §6 — start at the archetype's base size; +1 step if the dominant zone
 * runs_tight, −1 if runs_loose; clamp to the run. Accessories → "One Size". */
export function recommendedSize(product, archetype, fitMatrix) {
  if (!product.fit_applicable) return 'One Size'
  const isFootwear = product.category === 'Footwear'
  const run = isFootwear ? FOOTWEAR_SIZE_RUN : APPAREL_SIZE_RUN
  const baseSize = isFootwear ? archetype.base_footwear_uk : archetype.base_apparel_size
  const idx = run.indexOf(baseSize)
  const dominant = DOMINANT_ZONE[product.category]
  const state = fitMatrix?.[product.category]?.[archetype.id]?.[dominant]
  const shift = state === 'runs_tight' ? 1 : state === 'runs_loose' ? -1 : 0
  return run[clamp(idx + shift, 0, run.length - 1)]
}

function sumOutcomes(node) {
  let kept = 0
  let returned = 0
  for (const v of Object.values(node || {})) {
    if (typeof v.kept === 'number') {
      kept += v.kept
      returned += v.returned
    } else {
      const agg = sumOutcomes(v)
      kept += agg.kept
      returned += agg.returned
    }
  }
  return { kept, returned }
}

/** §6 — level = "size" if n≥20 for (product,archetype,size); else
 * "archetype" if n≥20; else "product". outcomeIndex shape:
 * { [productId]: { [archetypeId]: { [size]: {kept, returned} } } } */
export function socialProof(product, archetype, size, outcomeIndex) {
  const byProductNode = outcomeIndex?.[product.id] || {}
  const byArchetypeNode = byProductNode[archetype.id] || {}
  const sizeCell = byArchetypeNode[size]
  if (sizeCell && sizeCell.kept + sizeCell.returned >= 20) {
    const n = sizeCell.kept + sizeCell.returned
    return { rate: Math.round((sizeCell.kept / n) * 100), n, level: 'size' }
  }
  const archAgg = sumOutcomes(byArchetypeNode)
  const archN = archAgg.kept + archAgg.returned
  if (archN >= 20) {
    return { rate: Math.round((archAgg.kept / archN) * 100), n: archN, level: 'archetype' }
  }
  const prodAgg = sumOutcomes(byProductNode)
  const prodN = prodAgg.kept + prodAgg.returned
  return { rate: prodN ? Math.round((prodAgg.kept / prodN) * 100) : 70, n: prodN, level: 'product' }
}

/** §6 — the one scoring function both tools call. */
export function scoreProduct({ product, archetype, fitMatrix, outcomeIndex }) {
  if (!product.fit_applicable) {
    return { fit_applicable: false, fit_match_pct: null, social: null, hesitation: null, confidence_score: null, tier: null, contributions: null, off_zones: null, recommended_size: 'One Size' }
  }
  const row = fitMatrix?.[product.category]?.[archetype?.id]
  const off_zones = archetype ? offZoneCount(row) : 0
  const fit_match_pct = archetype
    ? clamp(product.base_fit_pct - 7 * off_zones, 0, 100)
    : clamp(product.base_fit_pct - 10, 0, 100) // no passport = more uncertainty
  const recommended_size = archetype ? recommendedSize(product, archetype, fitMatrix) : null
  const social = archetype ? socialProof(product, archetype, recommended_size, outcomeIndex) : { rate: 65, n: 0, level: 'product' }
  const hesitation = product.sku_hesitation_index
  const confidence_score = computeConfidenceScore({ fit_match_pct, social_proof_kept_it_rate: social.rate, hesitation_penalty: hesitation })
  const tier = confidence_score >= 80 ? 'high' : confidence_score >= 60 ? 'medium' : 'low'
  const contributions = {
    fit: Math.round(0.5 * fit_match_pct * 10) / 10,
    social: Math.round(0.3 * social.rate * 10) / 10,
    friction: Math.round(0.2 * (100 - hesitation) * 10) / 10
  }
  return { fit_applicable: true, fit_match_pct, social, hesitation, confidence_score, tier, contributions, off_zones, recommended_size }
}

export function computeReturnRate(orders, returns) {
  if (!orders?.length) return 0
  return Math.round((returns.length / orders.length) * 1000) / 10
}

const MONTHS_IN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** §11 (C11) — unambiguous date rendering everywhere, e.g. "25 Sep 2026". */
export function formatDateIN(isoDate) {
  if (!isoDate) return ''
  const d = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS_IN[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function daysBetween(isoA, isoB) {
  const a = new Date(`${isoA}T00:00:00Z`).getTime()
  const b = new Date(`${isoB}T00:00:00Z`).getTime()
  return Math.round((b - a) / 86400000)
}
