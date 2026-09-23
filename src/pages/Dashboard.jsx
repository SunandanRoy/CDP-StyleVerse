import { Link } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import KpiCard from '../components/KpiCard'
import { KpiCardSkeleton } from '../components/Skeleton'

// D7 — the End-to-end conversion KPI's note in the shared KPI table spells
// out the exact arithmetic (5.1M x 22% x 57% x 42% = 268,607 orders / 9.2M
// = 2.92%). This decomposes that same verified chain into funnel stages
// rather than restating it as an opaque string — 5,100,000 x 0.22 x 0.57 x
// 0.42 = 268,607 (rounded), the same figure the KPI table's note asserts.
const FUNNEL_STAGES = [
  { stage: 'Site visits', value: 5100000 },
  { stage: 'Product-view → cart (commit 22%)', value: 1122000, pctOfPrev: 22 },
  { stage: 'Cart → checkout start (57%)', value: 639540, pctOfPrev: 57 },
  { stage: 'Checkout → purchase (42%)', value: 268607, pctOfPrev: 42 }
]
const FUNNEL_TOTAL_ADDRESSABLE = 9200000
const FUNNEL_REQUIRED_PCT = 2.875

function FunnelBar({ stage, value, pctOfPrev, max }) {
  const widthPct = Math.max(2, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-56 shrink-0" style={{ color: 'var(--ink-mute)' }}>{stage}</div>
      <div className="h-6 flex-1 overflow-hidden rounded" style={{ background: 'var(--surface-alt)' }}>
        <div className="h-full rounded" style={{ width: `${widthPct}%`, background: 'var(--brand-accent)' }} />
      </div>
      <div className="w-24 shrink-0 text-right font-semibold">{value.toLocaleString('en-IN')}</div>
      <div className="w-12 shrink-0 text-right" style={{ color: 'var(--ink-mute)' }}>{pctOfPrev ? `×${pctOfPrev}%` : ''}</div>
    </div>
  )
}

export default function Dashboard() {
  const { brand, brandId } = useBrand()
  const { data, loading } = useFetch(brandId ? `/dashboard/${brandId}` : null)
  const { data: workforce } = useFetch('/workforce')
  const { data: capacity } = useFetch('/capacity-ledger')
  const { data: cases } = useFetch(brandId ? `/cases?brand_id=${brandId}` : null)

  if (!brand) return <div className="text-sm" style={{ color: 'var(--ink-mute)' }}>Loading brand…</div>

  const finalOrders = FUNNEL_STAGES[FUNNEL_STAGES.length - 1].value
  const finalConversionPct = Math.round((finalOrders / FUNNEL_TOTAL_ADDRESSABLE) * 10000) / 100
  const clearsRequirement = finalConversionPct >= FUNNEL_REQUIRED_PCT

  const returnRateRow = data ? {
    computed: data.computed_return_rate,
    target: data.benchmark.return_rate_target,
    onTrack: data.computed_return_rate <= data.benchmark.return_rate_target
  } : null
  const referenceCases = (cases || []).filter((c) => ['size_exchange', 'delivery_delay'].includes(c.template_type)).slice(0, 3)

  const currentMonthIndex = capacity?.summary?.current_month_index ?? 0
  const currentMonthHrs = capacity ? capacity.tasks.reduce((s, t) => s + (t.monthly[currentMonthIndex]?.hrs_freed || 0), 0) : 0

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">{brand.name} — Console Overview</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
          {brand.posture} · ai_tooling_mode: <code className="rounded px-1 py-0.5 text-xs" style={{ background: 'var(--surface-alt)', color: 'var(--ink)' }}>{brand.ai_tooling_mode}</code>
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
              Round 1 Exhibit 2 Benchmark (reference)
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

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                Revenue Funnel — Baseline-to-Commit Arithmetic
              </h2>
              <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>Same chain as the End-to-end Conversion KPI's note below, shown stage by stage.</p>
              <div className="space-y-1.5">
                {FUNNEL_STAGES.map((s) => <FunnelBar key={s.stage} {...s} max={FUNNEL_STAGES[0].value} />)}
              </div>
              <p className="mt-3 text-xs" style={{ color: clearsRequirement ? 'var(--good)' : 'var(--warn)' }}>
                {finalOrders.toLocaleString('en-IN')} orders ÷ {(FUNNEL_TOTAL_ADDRESSABLE / 1e6).toFixed(1)}M total addressable traffic = <strong>{finalConversionPct}%</strong> {clearsRequirement ? '≥' : '<'} {FUNNEL_REQUIRED_PCT}% required — {clearsRequirement ? 'clears the commitment.' : 'falls short.'}
              </p>
            </div>

            <div className="card">
              <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                Return Rate vs. Commitment — {brand.name}
              </h2>
              <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>Live computed rate against this brand's contract target, with supporting case references.</p>
              {returnRateRow && (
                <div className="flex items-baseline gap-3">
                  <span className="font-heading text-3xl font-bold" style={{ color: returnRateRow.onTrack ? 'var(--good)' : 'var(--warn)' }}>{returnRateRow.computed}%</span>
                  <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>vs {returnRateRow.target}% target ({returnRateRow.onTrack ? 'on track' : 'above target'})</span>
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                {referenceCases.length === 0 && <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>No fit-driven case references for this brand yet.</p>}
                {referenceCases.map((c) => (
                  <Link key={c.id} to={`/cases/${c.id}`} className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--edge)' }}>
                    <span>{c.id} — {c.template_type.replace(/_/g, ' ')} — {c.customer_name}</span>
                    <span style={{ color: 'var(--brand-accent)' }}>view case →</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {workforce && (
            <div className="mt-6 card">
              <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                Exhibit 2 — Time-Allocation Projection
              </h2>
              <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
                Target split of DCX hours between routine and high-value work, checked against what the Capacity Ledger has actually released this month.
              </p>
              <div className="mb-3 h-6 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-alt)' }}>
                <div className="flex h-full">
                  <div className="flex items-center justify-center text-[11px] font-semibold" style={{ width: `${workforce.routine_vs_high_value.routine}%`, background: 'var(--neutral, var(--ink-mute))', color: 'var(--surface)' }}>
                    Routine {workforce.routine_vs_high_value.routine}%
                  </div>
                  <div className="flex items-center justify-center text-[11px] font-semibold" style={{ width: `${workforce.routine_vs_high_value.high_value}%`, background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
                    High-value {workforce.routine_vs_high_value.high_value}%
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {workforce.exhibit2_time_allocation.map((a) => (
                  <div key={a.activity} className="rounded-md border p-2 text-center" style={{ borderColor: 'var(--edge)' }}>
                    <div className="font-heading text-lg font-bold">{a.pct}%</div>
                    <div className="text-[10px] leading-tight" style={{ color: 'var(--ink-mute)' }}>{a.activity}</div>
                  </div>
                ))}
              </div>
              {capacity && (
                <p className="mt-3 text-xs" style={{ color: 'var(--ink-mute)' }}>
                  Capacity Ledger today: <strong style={{ color: 'var(--ink)' }}>{Math.round(currentMonthHrs).toLocaleString('en-IN')} hrs/mo</strong> released across all sub-teams (≈{capacity.summary.fte_released_to_date} of {capacity.summary.fte_target} FTE target) — the pool this 70/30 split is projected against as automation matures.
                </p>
              )}
            </div>
          )}

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
              <table className="w-full min-w-[820px] text-sm">
                <thead style={{ background: 'var(--surface-alt)' }}>
                  <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                    <th className="px-3 py-2">KPI</th>
                    <th className="px-3 py-2">Baseline</th>
                    <th className="px-3 py-2">Commit</th>
                    <th className="px-3 py-2">Ambition</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kpiTable.map((row) => (
                    <tr key={row.kpi} className="border-t align-top" style={{ borderColor: 'var(--edge)' }}>
                      <td className="px-3 py-2 font-medium">{row.kpi}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{row.baseline}</td>
                      <td className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--brand-accent)' }}>{row.commit}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{row.ambition}</td>
                      <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--ink-mute)' }}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
