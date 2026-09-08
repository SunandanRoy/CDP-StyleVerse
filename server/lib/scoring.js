import { computeConfidenceScore } from '../../shared/confidence.js'

const DIRECTION_ADJUSTMENT = { true_to_size: 0, runs_tight: -9, runs_loose: -5 }

function djb2(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i)
  return Math.abs(hash >>> 0)
}

/**
 * Deterministic (never randomized) confidence computation for a given
 * product + archetype, driven by the live fit_matrix and real order/return
 * outcomes for same-archetype customers.
 */
export function computeProductConfidence(product, archetypeId, db) {
  const zoneRows = db.fit_matrix.filter((r) => r.category === product.category && r.archetype_id === archetypeId)
  const avgAdjustment = zoneRows.length
    ? zoneRows.reduce((sum, r) => sum + DIRECTION_ADJUSTMENT[r.fit_direction], 0) / zoneRows.length
    : 0
  const fit_match_pct = Math.max(30, Math.min(99, Math.round(product.base_fit_match_pct + avgAdjustment)))

  const sameArchetypeCustomerIds = new Set(db.customers.filter((c) => c.archetype_id === archetypeId).map((c) => c.id))
  let candidateOrders = db.orders.filter((o) => o.product_id === product.id && sameArchetypeCustomerIds.has(o.customer_id))
  let sourceLevel = 'product+archetype'
  if (candidateOrders.length < 3) {
    candidateOrders = db.orders.filter((o) => {
      const p = db.productsById.get(o.product_id)
      return p && p.category === product.category && p.brand_id === product.brand_id && sameArchetypeCustomerIds.has(o.customer_id)
    })
    sourceLevel = 'category+archetype'
  }
  let social_proof_kept_it_rate
  if (candidateOrders.length > 0) {
    const returnedIds = new Set(db.returns.map((r) => r.order_id))
    const kept = candidateOrders.filter((o) => o.status !== 'Returned' && !returnedIds.has(o.id)).length
    social_proof_kept_it_rate = Math.max(40, Math.min(98, Math.round((kept / candidateOrders.length) * 100)))
  } else {
    social_proof_kept_it_rate = 75
    sourceLevel = 'default'
  }

  const hesitation_penalty = 10 + (djb2(`${product.id}:${archetypeId}`) % 61)

  const confidence_score = computeConfidenceScore({ fit_match_pct, social_proof_kept_it_rate, hesitation_penalty })

  return {
    fit_match_pct,
    social_proof_kept_it_rate,
    hesitation_penalty,
    confidence_score,
    social_proof_sample_size: candidateOrders.length,
    social_proof_source_level: sourceLevel,
    zoneRows
  }
}
