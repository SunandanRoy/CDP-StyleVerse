import { useEffect, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import ProductImage from '../components/ProductImage'
import ScoreFormulaNote from '../components/ScoreFormulaNote'
import GeminiAction from '../components/GeminiAction'
import FitModel from '../components/FitModel/FitModel.jsx'

function scoreColor(score) {
  if (score >= 75) return '#15803d'
  if (score >= 60) return '#b45309'
  return '#b91c1c'
}

export default function ConfidenceLayer() {
  const { brandId, dial } = useBrand()
  const { data: products } = useFetch(brandId ? `/products?brand_id=${brandId}` : null)
  const { data: archetypes } = useFetch('/archetypes')
  const [productId, setProductId] = useState(null)
  const [archetypeId, setArchetypeId] = useState(null)

  useEffect(() => {
    if (products?.length && !productId) setProductId(products[0].id)
  }, [products, productId])
  useEffect(() => {
    if (archetypes?.length && !archetypeId) setArchetypeId(archetypes[0].id)
  }, [archetypes, archetypeId])
  useEffect(() => {
    if (products?.length) setProductId(products[0].id)
  }, [brandId]) // eslint-disable-line react-hooks/exhaustive-deps

  const product = products?.find((p) => p.id === productId)
  const { data: confidence } = useFetch(productId && archetypeId ? `/confidence/${productId}?archetype_id=${archetypeId}` : null)

  const isAdvisorMediated = dial?.disclosure_mode === 'Advisor-Mediated'
  const explainerName = isAdvisorMediated ? 'Your Styling Advisor' : 'StyleVerse AI Assistant'

  return (
    <div className="max-w-6xl">
      <h1 className="font-heading text-2xl font-bold">Confidence Layer</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        Scoring, explainability, and a read-only preview of the shopper-facing checkout fit-check.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="max-h-[560px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {products?.map((p) => (
            <button
              key={p.id}
              onClick={() => setProductId(p.id)}
              className="flex w-full items-center gap-3 rounded-md border px-2 py-2 text-left"
              style={{
                borderColor: p.id === productId ? 'var(--brand-accent)' : 'var(--edge)',
                background: p.id === productId ? 'var(--brand-accent-soft)' : 'var(--surface)'
              }}
            >
              <ProductImage src={p.image_url} category={p.category} alt={p.name} className="h-12 w-10 rounded object-cover" accent={undefined} />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{p.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>{p.category} · ₹{p.price_inr.toLocaleString('en-IN')}</div>
              </div>
            </button>
          ))}
        </div>

        {product && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  <ProductImage src={product.image_url_detail} category={product.category} alt={product.name} className="h-28 w-24 rounded-md object-cover" />
                  <div>
                    <h2 className="font-heading text-lg font-bold">{product.name}</h2>
                    <p className="text-sm" style={{ color: 'var(--ink-mute)' }}>{product.category} · ₹{product.price_inr.toLocaleString('en-IN')}</p>
                    <label className="mt-2 block text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>
                      Archetype
                      <select
                        value={archetypeId || ''}
                        onChange={(e) => setArchetypeId(e.target.value)}
                        className="mt-1 block rounded-md border px-2 py-1.5 text-sm"
                        style={{ borderColor: 'var(--edge)' }}
                      >
                        {archetypes?.map((a) => (
                          <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                {confidence && (
                  <div className="text-right">
                    <div className="font-heading text-4xl font-bold" style={{ color: scoreColor(confidence.confidence_score) }}>
                      {confidence.confidence_score}%
                    </div>
                    <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>confidence score</div>
                  </div>
                )}
              </div>

              {confidence && (
                <div className="mt-4">
                  <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-alt)' }}>
                    <div className="h-full rounded-full" style={{ width: `${confidence.confidence_score}%`, background: scoreColor(confidence.confidence_score) }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="card !p-2">
                      <div className="font-heading text-lg font-bold">{confidence.fit_match_pct}%</div>
                      <div style={{ color: 'var(--ink-mute)' }}>fit-match</div>
                    </div>
                    <div className="card !p-2">
                      <div className="font-heading text-lg font-bold">{confidence.social_proof_kept_it_rate}%</div>
                      <div style={{ color: 'var(--ink-mute)' }}>social-proof kept-it rate</div>
                    </div>
                    <div className="card !p-2">
                      <div className="font-heading text-lg font-bold">{confidence.hesitation_penalty}</div>
                      <div style={{ color: 'var(--ink-mute)' }}>hesitation penalty</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ScoreFormulaNote signals={confidence} />
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                {explainerName} — Explain This Score
              </h3>
              {productId && archetypeId && (
                <GeminiAction endpoint="/gemini/explain-score" payload={{ productId, archetypeId }} label="Explain this score" resultTitle={explainerName} />
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="card">
                <h3 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                  Interactive Fit Model
                </h3>
                {archetypeId && confidence && (
                  <FitModel archetypeId={archetypeId} productCategory={product.category} confidenceScore={confidence.confidence_score} />
                )}
              </div>

              <div className="card">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                    Customer View Preview
                  </h3>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
                    READ-ONLY
                  </span>
                </div>
                {confidence && (
                  <CheckoutPreview product={product} confidence={confidence} isAdvisorMediated={isAdvisorMediated} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckoutPreview({ product, confidence, isAdvisorMediated }) {
  const belowThreshold = confidence.confidence_score < 60
  return (
    <div className="rounded-md border p-3" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
      <div className="flex items-center gap-3">
        <ProductImage src={product.image_url} category={product.category} className="h-16 w-14 rounded object-cover" />
        <div className="text-sm">
          <div className="font-medium">{product.name}</div>
          <div style={{ color: 'var(--ink-mute)' }}>₹{product.price_inr.toLocaleString('en-IN')} · Size M</div>
        </div>
      </div>
      {belowThreshold ? (
        <div className="mt-3 rounded-md border p-2.5 text-xs" style={{ borderColor: '#f2c98d', background: '#fdf1e0', color: '#92400e' }}>
          <p className="font-semibold">⚠ This item may not fit as expected.</p>
          <p className="mt-1">
            {isAdvisorMediated ? 'Your styling advisor suggests' : 'We suggest'} trying <strong>one size up</strong> based on shoppers with a similar fit profile.
          </p>
          <div className="mt-2 flex gap-2">
            <button className="rounded bg-white px-2.5 py-1 font-semibold" style={{ border: '1px solid #f2c98d' }}>Update size</button>
            <button className="rounded px-2.5 py-1 font-semibold text-white" style={{ background: 'var(--brand-accent)' }}>Continue anyway</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-md border p-2.5 text-xs" style={{ borderColor: '#bfe3c8', background: '#e4f7e9', color: '#166534' }}>
          ✓ This should fit true to size based on your profile ({confidence.confidence_score}% confidence).
        </div>
      )}
    </div>
  )
}
