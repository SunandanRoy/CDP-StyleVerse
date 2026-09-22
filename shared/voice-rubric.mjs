// C3 — deterministic Brand Voice Certification rubric. Used both to seed
// certification_history (so seeded verdicts are reproducible from the same
// rubric) and at runtime as the always-on guard beneath any live Gemini
// call, so a live model can never certify something the rubric would fail.
const CASUAL_MARKERS = /\b(lol|lmao|omg|yeah|yep|nah|kinda|gonna|wanna|haha)\b/i
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
const URGENCY = /\b(hurry|limited time|act now|don't miss out|last chance)\b/i
const APOLOGY = /\b(sorry|apolog\w*)\b/gi

export function certifyVoice(text, brand) {
  const reasons = []
  const trimmed = (text || '').trim()

  if (trimmed.length < 15) {
    reasons.push('Draft is too short to certify — lacks substance for a brand-voice reply.')
  }
  if (trimmed.length > 500) {
    reasons.push("Draft exceeds the brand's conciseness guideline for a single reply.")
  }
  if (CASUAL_MARKERS.test(trimmed)) {
    reasons.push('Contains casual/slang markers not aligned with a professional support voice.')
  }
  const apologyCount = (trimmed.match(APOLOGY) || []).length
  if (apologyCount > 2) {
    reasons.push('Over-apologizes — more than 2 apology phrases reads as uncertain rather than helpful.')
  }
  const hasEmoji = EMOJI.test(trimmed)

  if (brand.id === 'maisonluxe') {
    if (hasEmoji) reasons.push('Maison Luxe voice guide prohibits emoji in any client-facing message.')
    if (URGENCY.test(trimmed)) reasons.push('Urgency language is inconsistent with Maison Luxe\'s advisor-mediated, unhurried tone.')
    if (!/meher|styling advisor/i.test(trimmed)) reasons.push('Missing the named advisor sign-off (e.g. "— Meher" or "Your Styling Advisor") required for Advisor-Mediated brands.')
  } else if (brand.id === 'ecoweave') {
    if (/sustainab|organic|recycled|eco-?friendly|verified/i.test(trimmed) && !/DOC-\d{4}/.test(trimmed)) {
      reasons.push('Sustainability claim is not traceable to a verified_claims source ID (e.g. DOC-1234) — EcoWeave requires every claim to cite its source.')
    }
  } else if (brand.id === 'threadbasics') {
    const templateOpeners = /^(thanks for reaching out|hi there|hello|thank you for contacting)/i
    if (!templateOpeners.test(trimmed)) {
      reasons.push('Does not match one of ThreadBasics\' approved rules-engine reply templates (no bespoke LLM copy permitted).')
    }
  } else {
    if (hasEmoji && brand.id === 'urbanedge') {
      // UrbanEdge tone allows at most one emoji
      const count = (trimmed.match(EMOJI) || []).length
      if (count > 1) reasons.push('More than one emoji exceeds UrbanEdge\'s tone guideline.')
    }
  }

  const verdict = reasons.length === 0 ? 'Pass' : 'Fail'
  const reason = reasons.length ? reasons.join(' ') : 'Tone is warm and on-brand, no policy concerns.'
  return { verdict, reason }
}
