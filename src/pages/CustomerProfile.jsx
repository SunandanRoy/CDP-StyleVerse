import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFetch } from '../lib/useFetch'
import { useBrand } from '../context/BrandContext'
import Badge from '../components/Badge'
import ScoreFormulaNote from '../components/ScoreFormulaNote'

const MODE_BADGE = {
  full_llm: 'escalation',
  internal_llm_only: 'signoff',
  retrieval_only: 'retrieval',
  rules_engine_only: 'rules'
}

function TimelineRow({ entry }) {
  if (entry.type === 'order') {
    const o = entry.ref
    return (
      <div className="flex items-start gap-3 py-2">
        <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: '#e6edfd', color: '#1d4ed8' }}>ORDER</span>
        <div className="text-sm">
          <span className="font-medium">{o.product_name}</span> · size {o.size} · <span style={{ color: 'var(--ink-mute)' }}>{o.status} via {o.channel}</span>
          <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>{o.date} · {o.id}</div>
        </div>
      </div>
    )
  }
  if (entry.type === 'return') {
    const r = entry.ref
    return (
      <div className="flex items-start gap-3 py-2">
        <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: '#fdf1e0', color: '#b45309' }}>RETURN</span>
        <div className="text-sm">
          <span className="font-medium">{r.reason_code.replaceAll('_', ' ')}</span> ·{' '}
          <span style={{ color: 'var(--ink-mute)' }}>
            {r.intercepted ? 'intercepted' : 'not intercepted'}{r.exchange_offered ? `, exchange ${r.exchange_accepted ? 'accepted' : 'declined'}` : ''}
          </span>
          <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>{r.id} · order {r.order_id}</div>
        </div>
      </div>
    )
  }
  const c = entry.ref
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: '#f1e9fe', color: '#7c3aed' }}>CASE</span>
      <div className="text-sm">
        <Link to={`/cases/${c.id}`} className="font-medium hover:underline" style={{ color: 'var(--brand-accent)' }}>{c.id}</Link> ·{' '}
        <span style={{ color: 'var(--ink-mute)' }}>{c.status}{c.predicted_grievance ? ' · ⚠ grievance likely' : ''}</span>
        <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>{c.channel_log[0]?.message?.slice(0, 80)}…</div>
      </div>
    </div>
  )
}

export default function CustomerProfile() {
  const { id } = useParams()
  const { brand } = useBrand()
  const { data: customer, loading } = useFetch(`/customers/${id}`)
  const { data: registry } = useFetch('/model-registry')

  const representativeProductId = useMemo(() => {
    if (!customer?.orders?.length) return null
    return customer.orders[0].product_id
  }, [customer])

  const { data: confidence } = useFetch(
    representativeProductId && customer ? `/confidence/${representativeProductId}?archetype_id=${customer.archetype_id}` : null
  )

  if (loading || !customer) return <div className="text-sm" style={{ color: 'var(--ink-mute)' }}>Loading profile…</div>

  return (
    <div className="max-w-5xl">
      <Link to="/customers" className="text-xs" style={{ color: 'var(--brand-accent)' }}>← Back to Unified Profile View</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {customer.channels.map((ch) => (
              <span key={ch} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: 'var(--edge)' }}>{ch}</span>
            ))}
            {customer.loyalty_id ? (
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: '#e4f7e9', color: '#15803d' }}>
                Linked via Fit Passport (loyalty_id: {customer.loyalty_id})
              </span>
            ) : (
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: '#fdf1e0', color: '#b45309' }}>
                Not yet bridged — marketplace identity unresolved
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="pii" />
          {brand && <Badge variant={MODE_BADGE[brand.ai_tooling_mode]} />}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
            Merged Timeline · orders + returns + cases
          </h2>
          <div className="card divide-y" style={{ borderColor: 'var(--edge)' }}>
            {customer.timeline.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-mute)' }}>No activity yet.</p>}
            {customer.timeline.map((entry, i) => (
              <TimelineRow key={i} entry={entry} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Live Confidence Score
            </h2>
            {confidence ? (
              <>
                <div className="font-heading text-3xl font-bold" style={{ color: 'var(--brand-accent)' }}>{confidence.confidence_score}%</div>
                <p className="mt-1 text-xs" style={{ color: 'var(--ink-mute)' }}>Based on most recent order + archetype: {customer.archetype_id.replace('arch_', '').replaceAll('_', ' ')}</p>
                <div className="mt-2">
                  <ScoreFormulaNote signals={confidence} />
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--ink-mute)' }}>No orders yet to compute a live score.</p>
            )}
          </div>

          <div className="card">
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Model Registry Trust
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {registry?.slice(0, 4).map((m) => (
                <span key={m.id} className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }} title={m.explainability_method}>
                  {m.component_name}
                </span>
              ))}
            </div>
            <Link to="/governance/model-registry" className="mt-2 inline-block text-xs" style={{ color: 'var(--brand-accent)' }}>
              View full Model Registry →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
