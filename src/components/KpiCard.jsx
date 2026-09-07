export default function KpiCard({ label, value, sub, accent = false }) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
        {label}
      </div>
      <div className="font-heading text-2xl font-bold" style={{ color: accent ? 'var(--brand-accent)' : 'var(--ink)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
