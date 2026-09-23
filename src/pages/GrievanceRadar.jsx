import { useMemo, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { DEMO_TODAY } from '../../shared/contract-constants.mjs'
import KpiCard from '../components/KpiCard'

function daysOpen(openedDate) {
  return Math.round((new Date(DEMO_TODAY) - new Date(openedDate)) / 86400000)
}

function riskScore(kase, order) {
  let score = 0
  if (kase.predicted_grievance) score += 50
  if (order?.delivery_exception) score += 30
  const d = daysOpen(kase.opened_date)
  if (d >= 5) score += 20
  else if (d >= 3) score += 10
  if (kase.status === 'Escalated') score += 10
  return Math.min(100, score)
}

function scoreColor(score) {
  if (score >= 70) return 'var(--warn)'
  if (score >= 40) return 'var(--accent2)'
  return 'var(--ink-mute)'
}

function DraftPanel({ kase, onSent }) {
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [drafted, setDrafted] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.post('/gemini/draft-outreach', { caseId: kase.id })
      setDraft(res.text || '')
      setDrafted(true)
    } catch (err) {
      toast.error('Could not draft outreach — try again')
    } finally {
      setLoading(false)
    }
  }

  const markSent = async () => {
    setLoading(true)
    try {
      await api.post(`/cases/${kase.id}/proactive-contact`, { message: draft })
      toast.success('Marked as sent — customer contacted before they had to ask')
      onSent(kase.id)
    } catch (err) {
      toast.error('Could not mark as sent — try again')
    } finally {
      setLoading(false)
    }
  }

  if (!drafted) {
    return (
      <button onClick={generate} disabled={loading} className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60" style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
        {loading ? 'Drafting…' : 'Draft outreach'}
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-md border p-2.5" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-full rounded-md border px-2 py-1.5 text-xs" style={{ borderColor: 'var(--edge)' }} />
      <button onClick={markSent} disabled={loading} className="mt-2 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60" style={{ background: 'var(--good)', color: '#fff' }}>
        {loading ? 'Sending…' : 'Mark sent'}
      </button>
    </div>
  )
}

export default function GrievanceRadar() {
  const { brand, brandId, dial } = useBrand()
  const { data: cases, loading } = useFetch(brandId ? `/cases?brand_id=${brandId}` : null)
  const { data: orders } = useFetch(brandId ? `/orders?brand_id=${brandId}` : null)
  const [dismissed, setDismissed] = useState(new Set())

  const ordersById = useMemo(() => new Map((orders || []).map((o) => [o.id, o])), [orders])
  const threshold = dial?.proactivity_threshold ?? 50

  const scored = useMemo(() => {
    return (cases || [])
      .filter((c) => !c.proactive && !dismissed.has(c.id) && ['Open', 'In Progress', 'Escalated'].includes(c.status))
      .map((c) => ({ ...c, order: ordersById.get(c.order_id), score: riskScore(c, ordersById.get(c.order_id)) }))
      .filter((c) => c.score >= threshold)
      .sort((a, b) => b.score - a.score)
  }, [cases, ordersById, threshold, dismissed])

  const preemptedThisMonth = useMemo(() => {
    const month = DEMO_TODAY.slice(0, 7)
    return (cases || []).filter((c) => c.proactive && (c.contacted_date || c.opened_date || '').slice(0, 7) === month).length
  }, [cases])

  const onSent = (caseId) => setDismissed((prev) => new Set(prev).add(caseId))

  if (!brand) return null

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">Grievance Radar — {brand.name}</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        Scores every open case for grievance risk (delivery exceptions, escalations, how long it's been open) and surfaces the ones above the Dial's proactivity threshold — contact the customer before they complain, not after.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Proactivity threshold (Dial)" value={`${threshold}%`} accent />
        <KpiCard label="At-risk cases now" value={loading ? '…' : scored.length} />
        <KpiCard label="Contacts pre-empted this month" value={preemptedThisMonth} />
      </div>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm" style={{ color: 'var(--ink-mute)' }}>Loading…</p>}
        {!loading && scored.length === 0 && (
          <div className="card text-sm" style={{ color: 'var(--ink-mute)' }}>
            No open cases score above this brand's {threshold}% proactivity threshold right now — lower the Dial's threshold in AI Involvement Dial to see more candidates, or check back after new orders come in.
          </div>
        )}
        {scored.map((c) => (
          <div key={c.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold">{c.customer_name || c.customer_id}</span>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${scoreColor(c.score)}22`, color: scoreColor(c.score) }}>
                    Risk {c.score}
                  </span>
                  {c.order?.delivery_exception && (
                    <span className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>Delivery exception</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-mute)' }}>
                  Case {c.id} · {c.template_type.replace(/_/g, ' ')} · open {daysOpen(c.opened_date)}d · status {c.status}
                </p>
              </div>
            </div>
            <DraftPanel kase={c} onSent={onSent} />
          </div>
        ))}
      </div>
    </div>
  )
}
