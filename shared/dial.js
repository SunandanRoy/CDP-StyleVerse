// Module 8: AI Involvement Dial — single source of truth for per-brand
// governance defaults and the mutation rules, shared by the Express server
// (server/data/db.js) and the standalone-build mock router
// (src/lib/mockRouter.js) so the two never drift.
//
// generative_content_allowed_clientfacing is itself adjustable EXCEPT for
// Maison Luxe, where it is a hard case constraint: client-facing generative
// content is prohibited outright, so the toggle is locked, not merely
// disabled in the UI — attempts to change it are silently ignored.
export const DIAL_DEFAULTS = {
  speedstyle: {
    automation_frequency: 85, tone: 'Energetic', proactivity_threshold: 70, escalation_threshold: 80,
    escalation_visible: false, generative_content_allowed_clientfacing: true
  },
  urbanedge: {
    automation_frequency: 55, tone: 'Professional', proactivity_threshold: 50, escalation_threshold: 60,
    escalation_visible: true, generative_content_allowed_clientfacing: true
  },
  maisonluxe: {
    automation_frequency: 20, tone: 'Warm & Refined', proactivity_threshold: 30, escalation_threshold: 20,
    escalation_visible: true, generative_content_allowed_clientfacing: false
  },
  ecoweave: {
    automation_frequency: 40, tone: 'Warm & Honest', proactivity_threshold: 55, escalation_threshold: 65,
    escalation_visible: true, generative_content_allowed_clientfacing: true
  },
  threadbasics: {
    automation_frequency: 90, tone: 'Straightforward', proactivity_threshold: 75, escalation_threshold: 85,
    escalation_visible: false, generative_content_allowed_clientfacing: true
  }
}

export const LOCKED_CLIENTFACING_GENERATIVE_BRANDS = new Set(['maisonluxe'])

export const DIAL_ALLOWED_KEYS = [
  'automation_frequency', 'tone', 'proactivity_threshold', 'escalation_threshold',
  'disclosure_mode', 'escalation_visible', 'generative_content_allowed_clientfacing'
]

export function buildDialSettings(brands) {
  return new Map(
    brands.map((b) => [
      b.id,
      { brand_id: b.id, ...DIAL_DEFAULTS[b.id], disclosure_mode: b.disclosure_mode }
    ])
  )
}

export function applyDialPatch(brandId, current, patch) {
  const next = { ...current }
  for (const key of DIAL_ALLOWED_KEYS) {
    if (patch[key] === undefined) continue
    if (key === 'generative_content_allowed_clientfacing' && LOCKED_CLIENTFACING_GENERATIVE_BRANDS.has(brandId)) continue
    next[key] = patch[key]
  }
  return next
}
