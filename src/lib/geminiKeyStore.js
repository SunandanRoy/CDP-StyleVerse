// C4 — memory-only Gemini key store for the Settings drawer. Never touches
// localStorage/sessionStorage; the key lives only in this module's closure
// and is gone on refresh. Only wired to the mock router in the standalone
// build — the dev/production Express server takes its key from the
// GEMINI_API_KEY env var instead (server/routes/gemini.js).
const STANDALONE = import.meta.env.VITE_STANDALONE === 'true'

let currentKey = null
const listeners = new Set()

export function setGeminiKeyGlobal(key) {
  currentKey = key || null
  if (STANDALONE) {
    import('./mockRouter.js').then((m) => m.setGeminiKey(currentKey))
  }
  listeners.forEach((fn) => fn(currentKey))
}

export function getGeminiKeyGlobal() {
  return currentKey
}

export function subscribeGeminiKey(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const GEMINI_KEY_APPLIES = STANDALONE
