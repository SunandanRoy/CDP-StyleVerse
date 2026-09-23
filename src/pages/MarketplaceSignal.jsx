import { useMemo, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { recommendedSize, formatDateIN } from '../../shared/sce-lib.mjs'
import { APPAREL_SIZE_RUN, FOOTWEAR_SIZE_RUN, DEMO_TODAY } from '../../shared/contract-constants.mjs'

// D5 — what each channel can actually surface. D2C runs through the app's
// own checkout, so it carries a named identity, Fit Passport and individual
// return reasons; a marketplace order is a platform's data, so this Console
// only ever sees SKU-level aggregates — never an individual buyer's name,
// measurements or free-text reason (mirrors the C1 fix's zero-identity rule).
const CAPABILITY_MATRIX = [
  { field: 'Buyer identity', d2c: 'Named customer profile', marketplace: 'Alias only (e.g. MKT-BUYER-0006) — no name' },
  { field: 'Fit Passport', d2c: 'Full measurements, bridgeable', marketplace: 'Not available — no passport can exist' },
  { field: 'Return reason', d2c: 'Individual free-text + decoded zone/direction', marketplace: 'SKU-level aggregate reason-code counts only' },
  { field: 'Order history', d2c: 'Full per-order timeline', marketplace: 'Per-alias order count only' },
  { field: 'Loyalty tie-in', d2c: 'Direct, real-time', marketplace: 'Only after an explicit claim is approved (bridge funnel)' },
  { field: 'Sizing guidance', d2c: 'Live interactive Fit Model + Confidence Layer', marketplace: 'Plan B: static text sizing badge pasted into the listing' }
]

function buildNestedFitMatrix(rows) {
  const nested = {}
  for (const r of rows) {
    nested[r.category] ??= {}
    nested[r.category][r.archetype_id] ??= {}
    nested[r.category][r.archetype_id][r.zone] = r.fit_direction
  }
  return nested
}

function sizingBadgeText(product, archetypes, fitMatrixNested) {
  const run = product.category === 'Footwear' ? FOOTWEAR_SIZE_RUN : APPAREL_SIZE_RUN
  const lines = [`SIZING GUIDE — ${product.name}`, '(Plan B — for marketplace listings with no interactive fit tool)', '']
  for (const a of archetypes) {
    const base = product.category === 'Footwear' ? a.base_footwear_uk : a.base_apparel_size
    const rec = recommendedSize(product, a, fitMatrixNested)
    const baseIdx = run.indexOf(base)
    const recIdx = run.indexOf(rec)
    let note
    if (recIdx > baseIdx) note = `order ${rec} — one size up from usual ${base}, runs small`
    else if (recIdx < baseIdx) note = `order ${rec} — one size down from usual ${base}, runs large`
    else note = `order your usual size (${rec}) — true to size`
    lines.push(`• ${a.label}: ${note}`)
  }
  lines.push('', `Generated ${formatDateIN(DEMO_TODAY)} from verified fit-matrix data — not a generative claim.`)
  return lines.join('\n')
}

export default function MarketplaceSignal() {
  const { brandId } = useBrand()
  const [fitOnly, setFitOnly] = useState(false)
  const [productId, setProductId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: products } = useFetch(brandId ? `/products?brand_id=${brandId}` : null)
  const { data: archetypes } = useFetch('/archetypes')
  const params = new URLSearchParams({ brand_id: brandId })
  if (fitOnly) params.set('mentions_fit', 'true')
  if (productId) params.set('product_id', productId)
  const { data: reviews } = useFetch(brandId ? `/reviews?${params.toString()}` : null)
  const { data: insights } = useFetch(brandId ? `/signal-insights?brand_id=${brandId}&_r=${refreshKey}` : null)
  const { data: marketplaceReturns } = useFetch(brandId ? `/returns?brand_id=${brandId}&channel=Marketplace&_r=${refreshKey}` : null)
  const { data: marketplaceBuyers } = useFetch(brandId ? `/marketplace-buyers?brand_id=${brandId}&_r=${refreshKey}` : null)
  const { data: fitMatrixRows } = useFetch('/fit-matrix')

  const [badgeProductId, setBadgeProductId] = useState('')
  const [approving, setApproving] = useState(false)

  const reasonAggregate = useMemo(() => {
    if (!marketplaceReturns) return []
    const bySku = new Map()
    for (const r of marketplaceReturns) {
      const key = r.product_id
      const entry = bySku.get(key) || { product_id: key, product_name: r.product_name, byReason: {} }
      entry.byReason[r.reason_code] = (entry.byReason[r.reason_code] || 0) + 1
      bySku.set(key, entry)
    }
    return [...bySku.values()]
      .map((e) => ({ ...e, total: Object.values(e.byReason).reduce((s, n) => s + n, 0) }))
      .sort((a, b) => b.total - a.total)
  }, [marketplaceReturns])

  const pendingClaims = useMemo(() => (marketplaceBuyers || []).filter((b) => b.pending_claim_for), [marketplaceBuyers])
  const approvedClaims = useMemo(() => (marketplaceBuyers || []).filter((b) => b.claimed_by), [marketplaceBuyers])

  const approveClaim = async (alias) => {
    setApproving(true)
    try {
      const res = await api.post(`/marketplace-buyers/${alias}/approve-claim`, {})
      toast.success(`Claim approved — ${res.customer.name} bridged with +250 loyalty points`)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error('Could not approve claim — try again')
    } finally {
      setApproving(false)
    }
  }

  const badgeProduct = products?.find((p) => p.id === badgeProductId)
  const fitMatrixNested = useMemo(() => buildNestedFitMatrix(fitMatrixRows || []), [fitMatrixRows])
  const badgeText = badgeProduct && archetypes ? sizingBadgeText(badgeProduct, archetypes, fitMatrixNested) : ''

  const copyBadge = async () => {
    try {
      await navigator.clipboard.writeText(badgeText)
      toast.success('Sizing badge copied — paste into the marketplace listing')
    } catch (err) {
      toast.error('Could not copy — select and copy manually')
    }
  }

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
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        {reviews ? `${reviews.length} reviews for this brand` : 'Reviews'}, mined for fit/sizing patterns to feed Merchandising &amp; Design.
      </p>

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
            <button onClick={generate} disabled={loading} className="w-full rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
              {loading ? 'Analyzing…' : 'Generate Insight'}
            </button>
            {result && (
              <div className="mt-3 rounded-md border p-3 text-xs" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {result.label && <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>{result.label}</span>}
                  {result.example && <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }} title={result.note}>(example response)</span>}
                </div>
                <p style={{ color: 'var(--ink)' }}>{result.text}</p>
                <p className="mt-2 font-semibold" style={{ color: 'var(--good)' }}>✓ Sent to Merchandising & Design feedback loop</p>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Past Insights</h2>
            <div className="space-y-2 text-xs">
              {insights?.map((i) => (
                <div key={i.id} className="border-b pb-2" style={{ borderColor: 'var(--edge)' }}>
                  <p>{i.insight_text}</p>
                  <p style={{ color: 'var(--ink-mute)' }}>→ {i.sent_to} · {formatDateIN(i.date)}</p>
                </div>
              ))}
              {insights?.length === 0 && <p style={{ color: 'var(--ink-mute)' }}>No insights yet for this brand.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 card">
        <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Channel Data Capability Matrix</h2>
        <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>What this Console can actually see per channel — the marketplace data boundary, made explicit.</p>
        <div className="overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
          <table className="w-full min-w-[560px] text-sm">
            <thead style={{ background: 'var(--surface-alt)' }}>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">D2C</th>
                <th className="px-3 py-2">Marketplace</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_MATRIX.map((row) => (
                <tr key={row.field} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                  <td className="px-3 py-2 font-medium">{row.field}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--good)' }}>{row.d2c}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--warn)' }}>{row.marketplace}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Marketplace Reason Codes — SKU-Level Aggregate</h2>
          <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>Counts only — no buyer identity behind any of these rows.</p>
          <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-thin pr-1 text-xs">
            {reasonAggregate.map((e) => (
              <div key={e.product_id} className="rounded-md border p-2" style={{ borderColor: 'var(--edge)' }}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold">{e.product_name}</span>
                  <span style={{ color: 'var(--ink-mute)' }}>{e.total} returns</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(e.byReason).map(([code, n]) => (
                    <span key={code} className="rounded-full px-2 py-0.5" style={{ background: 'var(--surface-alt)', color: 'var(--ink-mute)' }}>{code.replace(/_/g, ' ')}: {n}</span>
                  ))}
                </div>
              </div>
            ))}
            {reasonAggregate.length === 0 && <p style={{ color: 'var(--ink-mute)' }}>No marketplace returns for this brand.</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Bridge Funnel</h2>
          <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>Marketplace alias → claim submitted → approved &amp; bridged to a D2C profile (+250 loyalty points).</p>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border p-2" style={{ borderColor: 'var(--edge)' }}>
              <div className="font-heading text-lg font-bold">{marketplaceBuyers?.length ?? 0}</div>
              <div style={{ color: 'var(--ink-mute)' }}>marketplace aliases</div>
            </div>
            <div className="rounded-md border p-2" style={{ borderColor: 'var(--edge)' }}>
              <div className="font-heading text-lg font-bold" style={{ color: 'var(--warn)' }}>{pendingClaims.length}</div>
              <div style={{ color: 'var(--ink-mute)' }}>claims pending</div>
            </div>
            <div className="rounded-md border p-2" style={{ borderColor: 'var(--edge)' }}>
              <div className="font-heading text-lg font-bold" style={{ color: 'var(--good)' }}>{approvedClaims.length}</div>
              <div style={{ color: 'var(--ink-mute)' }}>bridged</div>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            {pendingClaims.map((b) => (
              <div key={b.buyer_alias} className="flex items-center justify-between rounded-md border p-2" style={{ borderColor: 'var(--warn-border)', background: 'var(--warn-soft)' }}>
                <span>{b.buyer_alias} — claim pending</span>
                <button onClick={() => approveClaim(b.buyer_alias)} disabled={approving} className="rounded-md px-2.5 py-1 font-semibold disabled:opacity-50" style={{ background: 'var(--good)', color: '#fff' }}>
                  {approving ? 'Approving…' : 'Approve & bridge (+250 pts)'}
                </button>
              </div>
            ))}
            {pendingClaims.length === 0 && <p style={{ color: 'var(--ink-mute)' }}>No pending claims for this brand right now.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 card">
        <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Plan-B Sizing Badge Generator</h2>
        <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>Marketplace listings can't host the interactive Fit Model — generate a static text sizing badge from the same verified fit-matrix data instead.</p>
        <select value={badgeProductId} onChange={(e) => setBadgeProductId(e.target.value)} className="mb-3 rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
          <option value="">Choose a product…</option>
          {products?.filter((p) => p.fit_applicable).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {badgeText && (
          <div>
            <pre className="whitespace-pre-wrap rounded-md border p-3 text-xs" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>{badgeText}</pre>
            <button onClick={copyBadge} className="mt-2 rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
              Copy to clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
