// Deterministic PRNG (mulberry32) so every server restart reproduces the
// exact same seeded dataset — required so confidence_adjustment_log entries
// stay consistent with the live fit_matrix across restarts.
export function mulberry32(seed) {
  let a = seed
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed = 20240601) {
  const rand = mulberry32(seed)
  return {
    float: () => rand(),
    int: (min, max) => Math.floor(rand() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(rand() * arr.length)],
    pickWeighted: (entries) => {
      // entries: [[value, weight], ...]
      const total = entries.reduce((s, [, w]) => s + w, 0)
      let r = rand() * total
      for (const [value, weight] of entries) {
        r -= weight
        if (r <= 0) return value
      }
      return entries[entries.length - 1][0]
    },
    bool: (probTrue = 0.5) => rand() < probTrue,
    shuffle: (arr) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
  }
}
