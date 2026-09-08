import { useEffect, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import { api } from '../lib/api'

const REASON_CODES = ['fit_runs_small', 'fit_runs_large', 'change_of_mind', 'quality', 'other']

export default function ReturnInterception() {
  const { brandId } = useBrand()
  const [reasonFilter, setReasonFilter] = useState('')
  const params = new URLSearchParams({ brand_id: brandId })
  if (reasonFilter) params.set('reason_code', reasonFilter)
  const { data: returns, loading } = useFetch(brandId ? `/returns?${params.toString()}` : null)

  const { data: customers } = useFetch(brandId ? `/customers?brand_id=${brandId}` : null)
  const [simCustomerId, setSimCustomerId] = useState('')
  const [simOrderId, setSimOrderId] = useState('')
  const [simReason, setSimReason] = useState(REASON_CODES[0])
  const { data: simOrders } = useFetch(simCustomerId ? `/orders?customer_id=${simCustomerId}` : null)
  const [simResult, setSimResult] = useState(null)
  const [simLoading, setSimLoading] = useState(false)

  useEffect(() => {
    setSimOrderId('')
    setSimResult(null)
  }, [simCustomerId])

  const runSimulation = async () => {
    if (!simCustomerId || !simOrderId) return
    setSimLoading(true)
    try {
      const res = await api.post('/returns/simulate', { customer_id: simCustomerId, order_id: simOrderId, reason_code: simReason })
      setSimResult(res)
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-heading text-2xl font-bold">Return Interception</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>Monitoring and a what-if simulator for the interception logic.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
              <option value="">All reasons</option>
              {REASON_CODES.map((r) => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
            </select>
            {returns && <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{returns.length} returns</span>}
          </div>
          <div className="overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
            <table className="w-full min-w-[640px] text-sm">
              <thead style={{ background: 'var(--surface-alt)' }}>
                <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Intercepted</th>
                  <th className="px-3 py-2">Exchange</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: 'var(--ink-mute)' }}>Loading…</td></tr>}
                {returns?.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                    <td className="px-3 py-2">{r.customer_name}</td>
                    <td className="px-3 py-2">{r.product_name}</td>
                    <td className="px-3 py-2 text-xs">{r.reason_code.replaceAll('_', ' ')}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: r.intercepted ? '#e4f7e9' : '#f4f4f5', color: r.intercepted ? '#15803d' : '#71717a' }}>
                        {r.intercepted ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>
                      {r.exchange_offered ? (r.exchange_accepted ? 'Offered · Accepted' : 'Offered · Declined') : 'Not offered'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Simulate a Return</h2>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>SIMULATOR — no data written</span>
          </div>

          <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>
            Customer
            <select value={simCustomerId} onChange={(e) => setSimCustomerId(e.target.value)} className="mt-1 block w-full rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
              <option value="">Select customer…</option>
              {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>
            Order
            <select value={simOrderId} onChange={(e) => setSimOrderId(e.target.value)} disabled={!simCustomerId} className="mt-1 block w-full rounded-md border px-2 py-1.5 text-sm disabled:opacity-50" style={{ borderColor: 'var(--edge)' }}>
              <option value="">Select order…</option>
              {simOrders?.map((o) => <option key={o.id} value={o.id}>{o.product_name} ({o.id})</option>)}
            </select>
          </label>

          <label className="mb-3 block text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>
            Reason code
            <select value={simReason} onChange={(e) => setSimReason(e.target.value)} className="mt-1 block w-full rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
              {REASON_CODES.map((r) => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
            </select>
          </label>

          <button
            onClick={runSimulation}
            disabled={!simCustomerId || !simOrderId || simLoading}
            className="w-full rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--brand-accent)' }}
          >
            {simLoading ? 'Simulating…' : 'Run simulation'}
          </button>

          {simResult && (
            <div className="mt-3 rounded-md border p-3 text-xs" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
              <div className="mb-1 flex gap-2">
                <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: simResult.intercepted ? '#e4f7e9' : '#f4f4f5', color: simResult.intercepted ? '#15803d' : '#71717a' }}>
                  {simResult.intercepted ? 'Would intercept' : 'Would not intercept'}
                </span>
                {simResult.exchange_offered && (
                  <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: '#e6edfd', color: '#1d4ed8' }}>
                    Exchange {simResult.exchange_accepted ? 'likely accepted' : 'offered'}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--ink-mute)' }}>{simResult.rationale}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
