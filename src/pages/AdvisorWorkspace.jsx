import { useEffect, useMemo, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import { api } from '../lib/api'
import { toast } from '../lib/toast'

const STAGES = ['Pick client', 'AI brief & looks', 'Sign-off', 'Advisor edit', 'Voice certification', 'Send']

function StageRail({ stage }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px]">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full font-semibold"
            style={i < stage ? { background: 'var(--good)', color: '#fff' } : i === stage ? { background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' } : { background: 'var(--surface-alt)', color: 'var(--ink-mute)' }}
          >
            {i < stage ? '✓' : i + 1}
          </span>
          <span style={{ color: i <= stage ? 'var(--ink)' : 'var(--ink-mute)', fontWeight: i === stage ? 600 : 400 }}>{s}</span>
          {i < STAGES.length - 1 && <span style={{ color: 'var(--ink-mute)' }}>›</span>}
        </div>
      ))}
    </div>
  )
}

export default function AdvisorWorkspace() {
  const { brand, brandId } = useBrand()
  const isAdvisorMediated = brand?.disclosure_mode === 'Advisor-Mediated'

  const { data: customers } = useFetch(brandId ? `/customers?brand_id=${brandId}` : null)
  const { data: archetypes } = useFetch('/archetypes')

  const [customerId, setCustomerId] = useState('')
  const [stage, setStage] = useState(0)
  const [looks, setLooks] = useState([])
  const [aiResult, setAiResult] = useState(null)
  const [draft, setDraft] = useState('')
  const [certResult, setCertResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const clientBook = useMemo(() => (customers || []).filter((c) => c.d2c_only || (c.channels || []).includes('D2C')), [customers])
  const customer = clientBook.find((c) => c.id === customerId)
  const archetype = archetypes?.find((a) => a.id === customer?.archetype_id)

  useEffect(() => {
    setCustomerId(''); setStage(0); setLooks([]); setAiResult(null); setDraft(''); setCertResult(null)
  }, [brandId])

  const pickClient = (id) => {
    setCustomerId(id)
    setStage(id ? 1 : 0)
    setLooks([]); setAiResult(null); setDraft(''); setCertResult(null)
  }

  const generateBrief = async () => {
    if (!customer) return
    setLoading(true)
    try {
      const scores = await api.get(`/confidence-batch?brand_id=${brandId}&archetype_id=${customer.archetype_id}`)
      const topLooks = [...scores].sort((a, b) => b.confidence_score - a.confidence_score).slice(0, 3)
      const products = await Promise.all(topLooks.map((s) => api.get(`/products/${s.product_id}`)))
      setLooks(products.map((p, i) => ({ ...p, confidence_score: topLooks[i].confidence_score })))
      const res = await api.post('/gemini/advisor-brief', { customerId: customer.id, brandId, productIds: products.map((p) => p.id) })
      setAiResult(res)
      setDraft(res.message || '')
      setStage(2)
    } catch (err) {
      toast.error('Could not generate the brief — try again')
    } finally {
      setLoading(false)
    }
  }

  const signOff = () => setStage(3)

  const runCertification = async () => {
    setLoading(true)
    try {
      const res = await api.post('/gemini/certify-voice', { draftText: draft, brandId })
      setCertResult(res)
      setStage(5)
    } catch (err) {
      toast.error('Certification failed — try again')
    } finally {
      setLoading(false)
    }
  }

  const verdictPass = /VERDICT:\s*Pass/i.test(certResult?.text || '')
  const materiallyEdited = aiResult && draft.trim() !== (aiResult.message || '').trim()

  const send = async () => {
    if (!verdictPass) return
    setLoading(true)
    try {
      if (materiallyEdited) {
        await api.post('/override-wins', {
          employee_name: 'Advisor (you)',
          sub_team: 'CRM & Loyalty',
          brand_id: brandId,
          ai_suggestion: aiResult.message,
          override_reason: 'Advisor personalized the AI-drafted client message before sending',
          outcome: 'Sent to client after human styling edit'
        })
        toast.success('Sent to client — edit logged to Override Wins')
      } else {
        toast.success('Sent to client')
      }
      setStage(6)
    } catch (err) {
      toast.error('Send failed — try again')
    } finally {
      setLoading(false)
    }
  }

  if (!brand) return null

  if (!isAdvisorMediated) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold">Advisor Workspace</h1>
        <div className="mt-4 card">
          <p className="text-sm" style={{ color: 'var(--ink-mute)' }}>
            {brand.name} runs disclosure_mode <code>{brand.disclosure_mode}</code> — the Advisor Workspace is only active for Advisor-Mediated brands (Maison Luxe, EcoWeave). Switch brands in the top bar to try it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-bold">Advisor Workspace — {brand.name}</h1>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>
          client_facing_generative: {String(brand.client_facing_generative)}
        </span>
      </div>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        AI drafts a brief and a client message from verified data. Nothing reaches a client until an advisor signs off, edits it, and Brand Voice Certification passes — {brand.hard_limit}
      </p>

      <StageRail stage={stage} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="card h-fit">
          <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Client book</h2>
          <div className="max-h-[520px] space-y-1 overflow-y-auto scrollbar-thin">
            {clientBook.map((c) => (
              <button
                key={c.id}
                onClick={() => pickClient(c.id)}
                className="block w-full rounded-md px-2.5 py-2 text-left text-sm"
                style={c.id === customerId ? { background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' } : { color: 'var(--ink)' }}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-[11px]" style={{ color: c.id === customerId ? 'var(--brand-accent-text)' : 'var(--ink-mute)', opacity: 0.85 }}>
                  {c.archetype_id} · {c.loyalty_id}
                </div>
              </button>
            ))}
            {clientBook.length === 0 && <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>No D2C clients for this brand.</p>}
          </div>
        </div>

        <div>
          {!customer && (
            <div className="card text-sm" style={{ color: 'var(--ink-mute)' }}>Pick a client from the book to start a session.</div>
          )}

          {customer && (
            <div className="space-y-4">
              <div className="card">
                <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>{customer.name}</h2>
                <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>
                  {archetype?.label || customer.archetype_id} · {customer.fit_passport_bridged ? 'Fit Passport bridged' : 'No Fit Passport yet'} · {customer.loyalty_id}
                </p>
                {stage === 1 && (
                  <button onClick={generateBrief} disabled={loading} className="mt-3 rounded-md px-3.5 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
                    {loading ? 'Generating…' : 'Generate AI brief & suggested looks'}
                  </button>
                )}
              </div>

              {aiResult && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="card">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-heading text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Internal brief (advisor-only)</h3>
                      {aiResult.example && <span className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>example response</span>}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{aiResult.brief}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {looks.map((l) => (
                        <span key={l.id} className="rounded-full border px-2 py-1 text-[11px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
                          {l.name} · {l.confidence_score}%
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="mb-1 font-heading text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Client-facing preview</h3>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{stage >= 3 ? draft : aiResult.message}</p>
                    {stage === 2 && (
                      <button onClick={signOff} className="mt-3 rounded-md border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--edge)' }}>
                        Sign off on brief & looks →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {stage >= 3 && (
                <div className="card">
                  <h3 className="mb-2 font-heading text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Advisor edit — final client message</h3>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--edge)' }}
                  />
                  {materiallyEdited && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--good)' }}>Edited from the AI draft — will be logged to Override Wins on send.</p>
                  )}
                  {stage === 3 && (
                    <button onClick={runCertification} disabled={loading} className="mt-3 rounded-md px-3.5 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
                      {loading ? 'Certifying…' : 'Run Brand Voice Certification'}
                    </button>
                  )}
                </div>
              )}

              {certResult && (
                <div className="card">
                  <h3 className="mb-1 font-heading text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Certification result</h3>
                  <p className="whitespace-pre-line text-sm" style={{ color: verdictPass ? 'var(--good)' : 'var(--warn)' }}>{certResult.text}</p>
                  {certResult.rubric_overrode_model && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--warn)' }}>Deterministic rubric overrode the model's verdict.</p>
                  )}
                  {stage === 5 && (
                    <button onClick={send} disabled={!verdictPass || loading} className="mt-3 rounded-md px-3.5 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: verdictPass ? 'var(--good)' : 'var(--edge)', color: '#fff' }}>
                      {loading ? 'Sending…' : verdictPass ? 'Send to client' : 'Fix message to pass certification first'}
                    </button>
                  )}
                </div>
              )}

              {stage === 6 && (
                <div className="card" style={{ borderColor: 'var(--good)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--good)' }}>✓ Sent — session complete for {customer.name}.</p>
                  <button onClick={() => pickClient('')} className="mt-2 text-xs font-medium underline" style={{ color: 'var(--brand-accent)' }}>Start a new client session</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
