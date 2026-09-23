import { Link } from 'react-router-dom'
import { useFetch } from '../lib/useFetch'
import Skeleton from '../components/Skeleton'

const GATE_COLORS = { Automate: 'var(--info)', Augment: 'var(--accent2)', Amplify: 'var(--good)', Eliminate: 'var(--warn)' }

export default function CareerLattice() {
  const { data: lattice, loading } = useFetch('/career-lattice')

  return (
    <div className="max-w-4xl">
      <h1 className="font-heading text-2xl font-bold">Career Lattice</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        5 role transitions enabled as AI takes over routine work (solution doc §10.2) — tied back to the{' '}
        <Link to="/business/capacity-ledger" style={{ color: 'var(--brand-accent)' }}>DCX Capacity Ledger</Link>.
      </p>

      {loading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <Skeleton className="h-9 w-28 rounded-md" />
                <span style={{ color: 'var(--ink-mute)' }}>→</span>
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
              <Skeleton className="h-8 w-56 rounded-md sm:w-64" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {lattice?.map((t, i) => {
            const gate = t.gate
            return (
              <div key={i} className="card flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3">
                  <div className="rounded-md border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
                    {t.from_role}
                  </div>
                  <span className="text-lg" style={{ color: 'var(--brand-accent)' }}>→</span>
                  <div className="rounded-md px-3 py-2 text-sm font-semibold" style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
                    {t.to_role}
                  </div>
                </div>
                <div className="sm:w-64">
                  <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>{t.description}</p>
                  <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${GATE_COLORS[gate]}22`, color: GATE_COLORS[gate] }}>
                    Enabled by capacity freed via {gate}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
