import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import KpiCard from '../components/KpiCard'
import { KpiCardSkeleton } from '../components/Skeleton'

const KPI_COMMITMENTS = [
  { kpi: 'Product-view → cart', baseline: '19%', commit: '22%', ambition: '25%', modules: '2, 3' },
  { kpi: 'End-to-end digital conversion', baseline: '2.5%', commit: '2.9%', ambition: '3.2%', modules: '2, 3' },
  { kpi: 'First-time fit accuracy (SpeedStyle)', baseline: '58%', commit: '68%', ambition: '75%', modules: '3, 5, 13' },
  { kpi: 'SpeedStyle return rate', baseline: '28%', commit: '22.4% blended (21% D2C / 23.5% marketplace)', ambition: '20%', modules: '4, 5, 13' },
  { kpi: 'Blended resolution time', baseline: '48 hrs', commit: '18 hrs', ambition: '8 hrs', modules: '6, 7' },
  { kpi: 'SpeedStyle resolution time', baseline: '72 hrs', commit: '24 hrs', ambition: '10 hrs', modules: '6, 7' },
  { kpi: 'Repeat purchase rate (SpeedStyle)', baseline: '32%', commit: '36%', ambition: '40%', modules: '4, 6' },
  { kpi: 'NPS (SpeedStyle)', baseline: '35', commit: '45', ambition: '52', modules: '6, 7' },
  { kpi: 'Fit Passport opt-in (D2C)', baseline: '—', commit: '>25% in 6 months', ambition: '—', modules: '1, 3' },
  { kpi: 'Case Thread / Track Everywhere weekly active use', baseline: '—', commit: '>80% eligible staff', ambition: '—', modules: '6, 7' },
  { kpi: 'Override rate', baseline: '—', commit: '15–30% healthy band', ambition: '—', modules: '10' },
  { kpi: 'Brand Voice first-pass rate', baseline: '—', commit: '>85% by Month 9', ambition: '—', modules: '9' }
]

export default function Dashboard() {
  const { brand, brandId } = useBrand()
  const { data, loading } = useFetch(brandId ? `/dashboard/${brandId}` : null)

  if (!brand) return <div className="text-sm" style={{ color: 'var(--ink-mute)' }}>Loading brand…</div>

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">{brand.name} — Console Overview</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
          {brand.posture} · ai_tooling_mode: <code className="rounded bg-black/5 px-1 py-0.5 text-xs">{brand.ai_tooling_mode}</code>
        </p>
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Customers" value={data.customers} sub="seeded, this brand" />
            <KpiCard label="Orders" value={data.orders} sub="last 6 months" />
            <KpiCard label="Open Cases" value={data.open_cases} sub="not Resolved/Closed" />
            <KpiCard label="Return Rate (computed)" value={`${data.computed_return_rate}%`} sub="from live order/return data" />
            <KpiCard label="Avg. Confidence Score" value={`${data.avg_confidence_score}%`} accent sub="0.5·fit + 0.3·social + 0.2·(100−hesitation)" />
          </div>

          <div className="mt-6">
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Case Benchmark — real seeded case data
            </h2>
            <div className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>NPS</div>
                <div className="font-heading text-xl font-bold">{data.benchmark.nps}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>Monthly Queries</div>
                <div className="font-heading text-xl font-bold">{data.benchmark.monthly_queries.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>Resolution Time</div>
                <div className="font-heading text-xl font-bold">{data.benchmark.resolution_hrs} hrs</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>Top Query Type</div>
                <div className="font-heading text-xl font-bold">{data.benchmark.top_query_type}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 card">
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Brand Hard Limit
            </h2>
            <p className="text-sm" style={{ color: 'var(--ink)' }}>{brand.hard_limit}</p>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                Strategic KPI Commitments — Business Case
              </h2>
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
                Reference targets, not live-computed
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
              <table className="w-full min-w-[720px] text-sm">
                <thead style={{ background: 'var(--surface-alt)' }}>
                  <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                    <th className="px-3 py-2">KPI</th>
                    <th className="px-3 py-2">Baseline</th>
                    <th className="px-3 py-2">Commit</th>
                    <th className="px-3 py-2">Ambition</th>
                    <th className="px-3 py-2">Modules</th>
                  </tr>
                </thead>
                <tbody>
                  {KPI_COMMITMENTS.map((row) => (
                    <tr key={row.kpi} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                      <td className="px-3 py-2 font-medium">{row.kpi}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{row.baseline}</td>
                      <td className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--brand-accent)' }}>{row.commit}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{row.ambition}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{row.modules}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
              Corrected return-rate commit: 22.4% blended clears the ≥20% reduction mandate (an earlier 23% draft arithmetically missed it). Marketplace return-rate tracking sits in Phase 1, not deferred to a D2C-only pilot.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
