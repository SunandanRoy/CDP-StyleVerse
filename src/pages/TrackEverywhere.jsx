import { useMemo, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import BarChart from '../components/BarChart'
import FitModel from '../components/FitModel/FitModel.jsx'

const STATUS_COLORS = {
  Delivered: '#15803d', 'In Transit': '#1d4ed8', Processing: '#b45309', Returned: '#b91c1c', Cancelled: '#71717a'
}

export default function TrackEverywhere() {
  const { brandId } = useBrand()
  const [channel, setChannel] = useState('')
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')

  const params = new URLSearchParams({ brand_id: brandId })
  if (channel) params.set('channel', channel)
  const { data: orders, loading } = useFetch(brandId ? `/orders?${params.toString()}` : null)
  const { data: customers } = useFetch(brandId ? `/customers?brand_id=${brandId}` : null)
  const { data: customerDetail } = useFetch(customerId ? `/customers/${customerId}` : null)
  const { data: confidence } = useFetch(
    customerDetail?.orders?.length ? `/confidence/${customerDetail.orders[0].product_id}?archetype_id=${customerDetail.archetype_id}` : null
  )
  const { data: product } = useFetch(customerDetail?.orders?.length ? `/products/${customerDetail.orders[0].product_id}` : null)

  const filtered = useMemo(() => {
    if (!orders) return []
    if (!search) return orders
    const q = search.toLowerCase()
    return orders.filter((o) => o.customer_name?.toLowerCase().includes(q) || o.product_name?.toLowerCase().includes(q) || o.id.includes(q))
  }, [orders, search])

  const statusDist = useMemo(() => {
    if (!orders) return []
    const counts = {}
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1
    return Object.entries(counts).map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] }))
  }, [orders])

  return (
    <div className="max-w-6xl">
      <h1 className="font-heading text-2xl font-bold">Track Everywhere</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>Aggregated order tracking across all 160 seeded orders, with a unified per-customer preview.</p>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="card mb-4">
            <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Status Distribution</h2>
            {statusDist.length > 0 && <BarChart data={statusDist} />}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
              <option value="">All channels</option>
              <option value="D2C">D2C</option>
              <option value="Marketplace">Marketplace</option>
            </select>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders…" className="w-56 rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }} />
            {orders && <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{filtered.length} of {orders.length} orders</span>}
          </div>

          <div className="overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
            <table className="w-full min-w-[640px] text-sm">
              <thead style={{ background: 'var(--surface-alt)' }}>
                <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Channel</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="px-3 py-6 text-center" style={{ color: 'var(--ink-mute)' }}>Loading…</td></tr>}
                {filtered.slice(0, 60).map((o) => (
                  <tr key={o.id} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                    <td className="px-3 py-2 text-xs">{o.id}</td>
                    <td className="px-3 py-2">{o.customer_name}</td>
                    <td className="px-3 py-2 text-xs">{o.product_name}</td>
                    <td className="px-3 py-2 text-xs">{o.channel}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${STATUS_COLORS[o.status]}22`, color: STATUS_COLORS[o.status] }}>{o.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Customer Preview</h2>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>PREVIEW</span>
          </div>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="mb-3 block w-full rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
            <option value="">Select a customer…</option>
            {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.loyalty_id ? ' (bridged)' : ''}</option>)}
          </select>

          {customerDetail && (
            <>
              <div className="mb-3 max-h-56 space-y-2 overflow-y-auto scrollbar-thin text-xs">
                {customerDetail.timeline.filter((t) => t.type === 'order').map((t, i) => (
                  <div key={i} className="flex items-center justify-between border-b py-1" style={{ borderColor: 'var(--edge)' }}>
                    <span>{t.ref.product_name}</span>
                    <span style={{ color: STATUS_COLORS[t.ref.status] }}>{t.ref.status}</span>
                    <span style={{ color: 'var(--ink-mute)' }}>{t.ref.channel}</span>
                  </div>
                ))}
                {customerDetail.timeline.filter((t) => t.type === 'order').length === 0 && (
                  <p style={{ color: 'var(--ink-mute)' }}>No orders for this customer.</p>
                )}
              </div>
              {product && confidence && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold" style={{ color: 'var(--ink-mute)' }}>Most recent item — fit visualization</p>
                  <FitModel archetypeId={customerDetail.archetype_id} productCategory={product.category} confidenceScore={confidence.confidence_score} heightPx={260} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
