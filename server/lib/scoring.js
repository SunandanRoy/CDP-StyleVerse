import { scoreProduct } from '../../shared/sce-lib.mjs'

/**
 * Thin adapter over the contract's scoreProduct() (§6) that returns the
 * field names the v1 frontend already expects, so most pages don't need to
 * change shape even though the underlying computation is now the real
 * contract formula (real seeded sku_hesitation_index, not a hash; real
 * outcome-aggregate social proof, not a synthetic default).
 */
export function computeProductConfidence(product, archetypeId, db) {
  const archetype = db.archetypesById.get(archetypeId) || null
  const result = scoreProduct({ product, archetype, fitMatrix: db.fit_matrix_nested, outcomeIndex: db.outcomeIndex })
  return {
    fit_match_pct: result.fit_match_pct,
    social_proof_kept_it_rate: result.social?.rate ?? null,
    hesitation_penalty: result.hesitation,
    confidence_score: result.confidence_score,
    social_proof_sample_size: result.social?.n ?? 0,
    social_proof_source_level: result.social?.level ?? 'product',
    tier: result.tier,
    contributions: result.contributions,
    recommended_size: result.recommended_size,
    off_zones: result.off_zones,
    fit_applicable: result.fit_applicable
  }
}
