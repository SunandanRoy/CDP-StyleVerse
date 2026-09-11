// Module 4 — Return Interception decision logic (PRD §6, Module 4):
//
//   IF reason_code == "fit"
//      AND corrected_size_confidence > threshold
//      AND corrected_size_in_stock
//   THEN render pre-filled exchange offer
//   ELSE standard return confirmation
//
// Shared by the Express server and the standalone-build mock router so the
// simulator and the real (mocked) decision path can never diverge.
export const CORRECTED_SIZE_CONFIDENCE_THRESHOLD = 55

export function simulateReturnInterception({ customer, order, product, brand, reasonCode, confidenceScore }) {
  const isFitDriven = reasonCode === 'fit_runs_small' || reasonCode === 'fit_runs_large'
  let corrected_size = null
  let corrected_size_in_stock = null
  let corrected_size_confidence = null
  let intercepted = false
  let exchange_offered = false
  let exchange_accepted = false
  let rationale = ''

  if (isFitDriven) {
    const sizeIdx = product.sizes.indexOf(order.size)
    const delta = reasonCode === 'fit_runs_small' ? 1 : -1
    const targetIdx = sizeIdx + delta
    corrected_size = targetIdx >= 0 && targetIdx < product.sizes.length ? product.sizes[targetIdx] : null
    corrected_size_in_stock = corrected_size ? !(product.out_of_stock_sizes || []).includes(corrected_size) : false
    corrected_size_confidence = confidenceScore

    if (corrected_size && corrected_size_in_stock && corrected_size_confidence > CORRECTED_SIZE_CONFIDENCE_THRESHOLD) {
      intercepted = true
      exchange_offered = true
      exchange_accepted = brand.ai_tooling_mode !== 'rules_engine_only'
      rationale = `Fit-driven return for ${product.name}: corrected size ${corrected_size} is in stock at ${corrected_size_confidence}% confidence for ${customer.name}'s Fit Passport (threshold >${CORRECTED_SIZE_CONFIDENCE_THRESHOLD}%) — interception logic renders a pre-filled exchange offer before the return is finalized.`
    } else {
      const reasonWhy = !corrected_size
        ? 'no adjacent size exists in this product\'s size run'
        : !corrected_size_in_stock
        ? `the corrected size (${corrected_size}) is out of stock`
        : `corrected-size confidence (${corrected_size_confidence}%) does not clear the >${CORRECTED_SIZE_CONFIDENCE_THRESHOLD}% threshold`
      rationale = `Fit-driven return for ${product.name}, but ${reasonWhy} — interception logic falls through to a standard return confirmation.`
    }
  } else {
    exchange_offered = reasonCode === 'change_of_mind'
    rationale = `Reason code "${reasonCode}" is not fit-driven, so interception logic routes this straight to standard return processing${exchange_offered ? ', with an optional exchange offer' : ''}.`
  }

  return { intercepted, exchange_offered, exchange_accepted, corrected_size, corrected_size_in_stock, corrected_size_confidence, rationale }
}
