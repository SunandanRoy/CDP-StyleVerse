export default function KpiCard({ label, value, sub, accent = false }) {
  return (
    <div className="card relative flex flex-col gap-1 overflow-hidden pl-4">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: accent ? 'var(--brand-accent)' : 'var(--edge)' }} />
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
