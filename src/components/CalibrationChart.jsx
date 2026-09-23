// D6 — reliability diagram: predicted confidence decile vs. observed kept
// rate from the same outcomeIndex data the score reads, plus the Brier
// score (0 = perfectly calibrated, 0.25 = uninformative, 1 = maximally
// wrong). Used on both Confidence Layer (brand-scoped) and Model
// Registry's confidence-model card (all brands).
export default function CalibrationChart({ data, loading }) {
  if (loading) return <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>Computing calibration…</p>
  if (!data || data.deciles.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>Not enough seeded outcome data to calibrate yet.</p>
  }

  const brier = data.brier_score
  const brierColor = brier == null ? 'var(--ink-mute)' : brier < 0.1 ? 'var(--good)' : brier < 0.2 ? 'var(--warn)' : 'var(--bad)'

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="rounded-md border px-3 py-1.5 text-xs" style={{ borderColor: 'var(--edge)' }}>
          Brier score: <strong style={{ color: brierColor }}>{brier != null ? brier.toFixed(3) : '—'}</strong>
          <span style={{ color: 'var(--ink-mute)' }}> (0 = perfect, 0.25 = uninformative)</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{data.n_cells} product×archetype cells, {data.total_n} seeded outcomes</span>
      </div>
      <div className="space-y-1.5">
        {data.deciles.map((d) => (
          <div key={d.decile} className="flex items-center gap-2 text-xs">
            <div className="w-16 shrink-0" style={{ color: 'var(--ink-mute)' }}>{d.label}</div>
            <div className="relative h-4 flex-1 overflow-hidden rounded" style={{ background: 'var(--surface-alt)' }}>
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${d.predicted_mean}%`, background: 'var(--brand-accent)', opacity: 0.35 }} />
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${d.observed_rate}%`, borderRight: '2px solid var(--good)' }} />
            </div>
            <div className="w-40 shrink-0 text-right" style={{ color: 'var(--ink-mute)' }}>
              pred {d.predicted_mean}% · obs {d.observed_rate}% <span className="opacity-70">(n={d.n})</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
        <span><span className="mr-1 inline-block h-2 w-2 rounded" style={{ background: 'var(--brand-accent)', opacity: 0.35 }} />predicted</span>
        <span><span className="mr-1 inline-block h-2 w-0.5" style={{ background: 'var(--good)' }} />observed kept rate</span>
      </div>
    </div>
  )
}
