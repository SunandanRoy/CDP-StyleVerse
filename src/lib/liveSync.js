// D9 — optional live event bus stub. Default OFF. When a sibling
// Storefront tab exists and writes to localStorage["sce_event_bus_v1"],
// this reads those events via the cross-tab "storage" event so the
// Console could reflect Storefront activity live. No such Storefront
// project exists in this Console-only build (see SCE_DATA_CONTRACT.md's
// Console-only note), so this is a real, working listener with nothing to
// listen to — a documented stub, not a fake indicator.
const FLAG_KEY = 'styleverse.liveSyncEnabled'
const BUS_KEY = 'sce_event_bus_v1'

export function isLiveSyncEnabled() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function setLiveSyncEnabled(enabled) {
  try {
    if (enabled) localStorage.setItem(FLAG_KEY, '1')
    else localStorage.removeItem(FLAG_KEY)
  } catch {
    // localStorage unavailable (private mode etc.) — flag just won't persist.
  }
}

/** Reads whatever is currently in the bus key, if any. */
export function readLastEvent() {
  try {
    const raw = localStorage.getItem(BUS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Subscribes to cross-tab writes on the event-bus key. Returns an
 * unsubscribe function. No-op (but still returns a valid unsubscribe) when
 * live sync is disabled, so callers don't need to branch on the flag. */
export function subscribeLiveSync(onEvent) {
  if (!isLiveSyncEnabled()) return () => {}
  const handler = (e) => {
    if (e.key !== BUS_KEY || !e.newValue) return
    try {
      onEvent(JSON.parse(e.newValue))
    } catch {
      // malformed payload from whatever wrote the key — ignore it.
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
