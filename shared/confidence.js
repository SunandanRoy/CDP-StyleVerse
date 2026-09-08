// Single source of truth for the confidence score formula and cross-module
// constants. Imported identically by the Express server and the React client.

export const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Footwear', 'Dresses', 'Accessories']

export const AI_TOOLING_MODES = ['full_llm', 'internal_llm_only', 'retrieval_only', 'rules_engine_only']

export const AI_TOOLING_MODE_LABELS = {
  full_llm: 'Full LLM',
  internal_llm_only: 'Internal LLM Only',
  retrieval_only: 'Retrieval Only',
  rules_engine_only: 'Rules Engine Only'
}

/**
 * confidence_score = round(0.5*fit_match_pct + 0.3*social_proof_kept_it_rate + 0.2*(100-hesitation_penalty))
 * clamped 0-100. Used identically on every screen that shows a score.
 */
export function computeConfidenceScore({ fit_match_pct, social_proof_kept_it_rate, hesitation_penalty }) {
  const raw = 0.5 * fit_match_pct + 0.3 * social_proof_kept_it_rate + 0.2 * (100 - hesitation_penalty)
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export const CONFIDENCE_FORMULA_TEXT =
  'confidence_score = round(0.5 × fit_match_pct + 0.3 × social_proof_kept_it_rate + 0.2 × (100 − hesitation_penalty)), clamped 0–100'

export function confidenceFormulaBreakdown({ fit_match_pct, social_proof_kept_it_rate, hesitation_penalty }) {
  const fitTerm = 0.5 * fit_match_pct
  const socialTerm = 0.3 * social_proof_kept_it_rate
  const hesitationTerm = 0.2 * (100 - hesitation_penalty)
  const score = computeConfidenceScore({ fit_match_pct, social_proof_kept_it_rate, hesitation_penalty })
  return { fitTerm, socialTerm, hesitationTerm, score }
}
