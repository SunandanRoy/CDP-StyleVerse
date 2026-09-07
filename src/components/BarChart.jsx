export default function BarChart({ data, valueSuffix = '' }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <div className="w-32 shrink-0 truncate" style={{ color: 'var(--ink-mute)' }}>{d.label}</div>
          <div className="h-4 flex-1 overflow-hidden rounded" style={{ background: 'var(--surface-alt)' }}>
            <div
              className="h-full rounded"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color || 'var(--brand-accent)', transition: 'width 300ms ease' }}
            />
          </div>
          <div className="w-10 shrink-0 text-right font-semibold">{d.value}{valueSuffix}</div>
        </div>
      ))}
    </div>
  )
}
