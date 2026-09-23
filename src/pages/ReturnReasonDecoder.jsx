import { useMemo, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import BarChart from '../components/BarChart'
import KpiCard from '../components/KpiCard'
import { CATEGORIES } from '../../shared/confidence.js'

// §8 — the contract's 5-code return reason vocabulary (D2C: free-text +
// decoded {category, zone, direction}; Marketplace: reason code only).
const REASON_LABELS = {
  size_fit: 'Size / fit',
  defective: 'Defective',
  not_as_described: 'Not as described',
  no_longer_needed: 'No longer needed',
  other: 'Other'
}

export default function ReturnReasonDecoder() {
  const { brandId } = useBrand()
  const [category, setCategory] = useState('')
  const params = new URLSearchParams({ brand_id: brandId })
  if (category) params.set('category', category)
  const { data: returns, loading } = useFetch(brandId ? `/returns?${params.toString()}` : null)

  const stats = useMemo(() => {
    if (!returns) return null
    const byReason = {}
    for (const code of Object.keys(REASON_LABELS)) byReason[code] = 0
    for (const r of returns) byReason[r.reason_code] = (byReason[r.reason_code] || 0) + 1

    const fitDriven = returns.filter((r) => r.reason_code === 'size_fit')
    const smallCount = returns.filter((r) => r.decoded?.direction === 'too tight').length
    const largeCount = returns.filter((r) => r.decoded?.direction === 'too loose').length
    const interceptedFitDriven = fitDriven.filter((r) => r.intercepted).length
    const interceptRate = fitDriven.length ? Math.round((interceptedFitDriven / fitDriven.length) * 100) : 0

    return { byReason, fitDrivenCount: fitDriven.length, smallCount, largeCount, interceptRate, total: returns.length }
  }, [returns])

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">Return Reason Decoder</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>Aggregated view of the 42 seeded returns, filterable by category.</p>

      <div className="mt-4 flex items-center gap-3">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading || !stats ? (
        <p className="mt-6 text-sm" style={{ color: 'var(--ink-mute)' }}>Loading…</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total Returns" value={stats.total} />
            <KpiCard label="Fit-driven" value={stats.fitDrivenCount} sub={`${stats.smallCount} small · ${stats.largeCount} large`} />
            <KpiCard label="% Fit-driven Intercepted" value={`${stats.interceptRate}%`} accent />
            <KpiCard label="Other Reasons" value={stats.total - stats.fitDrivenCount} />
          </div>

          <div className="mt-6 card">
            <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Reason Code Distribution
            </h2>
            <BarChart
              data={Object.entries(stats.byReason).map(([code, value]) => ({
                label: REASON_LABELS[code],
                value,
                color: code === 'size_fit' ? 'var(--brand-accent)' : 'var(--neutral)'
              }))}
            />
          </div>

          <div className="mt-6 card">
            <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Fit-Driven Split
            </h2>
            <BarChart
              data={[
                { label: 'Runs small', value: stats.smallCount, color: 'var(--warn)' },
                { label: 'Runs large', value: stats.largeCount, color: 'var(--info)' }
              ]}
            />
          </div>
        </>
      )}
    </div>
  )
}
