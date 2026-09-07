import { useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import { api } from '../lib/api'

export default function MarketplaceSignal() {
  const { brandId } = useBrand()
  const [fitOnly, setFitOnly] = useState(false)
  const [productId, setProductId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: products } = useFetch(brandId ? `/products?brand_id=${brandId}` : null)
  const params = new URLSearchParams({ brand_id: brandId })
  if (fitOnly) params.set('mentions_fit', 'true')
  if (productId) params.set('product_id', productId)
  const { data: reviews } = useFetch(brandId ? `/reviews?${params.toString()}` : null)
  const { data: insights } = useFetch(brandId ? `/signal-insights?brand_id=${brandId}&_r=${refreshKey}` : null)

  const generate = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await api.post('/gemini/signal-insight', { brandId, productId: productId || undefined })
      setResult(res)
      await api.post('/signal-insights', { brand_id: brandId, insight_text: res.text, sent_to: 'Merchandising & Design' })
      setRefreshKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">Marketplace Signal Engine</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>70 seeded reviews, mined for fit/sizing patterns to feed Merchandising & Design.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
          <option value="">All products</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-mute)' }}>
          <input type="checkbox" checked={fitOnly} onChange={(e) => setFitOnly(e.target.checked)} />
          mentions_fit only
        </label>
        {reviews && <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{reviews.length} reviews</span>}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="max-h-[480px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {reviews?.map((r) => (
            <div key={r.id} className="card">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold">{r.product_name}</span>
                <div className="flex items-center gap-1.5">
                  {r.mentions_fit && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>mentions fit</span>}
                  <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
              </div>
              <p className="text-sm">{r.text}</p>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-mute)' }}>{r.channel}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Generate Insight</h2>
            <button onClick={generate} disabled={loading} className="w-full rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-accent)' }}>
              {loading ? 'Analyzing…' : 'Generate Insight'}
            </button>
            {result && (
              <div className="mt-3 rounded-md border p-3 text-xs" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {result.label && <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>{result.label}</span>}
                  {result.example && <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }} title={result.note}>(example response)</span>}
                </div>
                <p style={{ color: 'var(--ink)' }}>{result.text}</p>
                <p className="mt-2 font-semibold" style={{ color: '#15803d' }}>✓ Sent to Merchandising & Design feedback loop</p>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Past Insights</h2>
            <div className="space-y-2 text-xs">
              {insights?.map((i) => (
                <div key={i.id} className="border-b pb-2" style={{ borderColor: 'var(--edge)' }}>
                  <p>{i.insight_text}</p>
                  <p style={{ color: 'var(--ink-mute)' }}>→ {i.sent_to} · {i.date}</p>
                </div>
              ))}
              {insights?.length === 0 && <p style={{ color: 'var(--ink-mute)' }}>No insights yet for this brand.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
