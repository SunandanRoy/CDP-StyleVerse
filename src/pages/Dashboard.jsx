import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import KpiCard from '../components/KpiCard'

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
        <div className="text-sm" style={{ color: 'var(--ink-mute)' }}>Loading dashboard…</div>
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
        </>
      )}
    </div>
  )
}
