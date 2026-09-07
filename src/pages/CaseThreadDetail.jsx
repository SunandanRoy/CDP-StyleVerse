import { Link, useParams } from 'react-router-dom'
import { useFetch } from '../lib/useFetch'
import { useBrand } from '../context/BrandContext'
import GeminiAction from '../components/GeminiAction'
import Badge from '../components/Badge'

const MODE_BADGE = {
  full_llm: 'escalation',
  internal_llm_only: 'signoff',
  retrieval_only: 'retrieval',
  rules_engine_only: 'rules'
}

export default function CaseThreadDetail() {
  const { id } = useParams()
  const { data: kase, loading } = useFetch(`/cases/${id}`)
  const { brand, dial } = useBrand()

  if (loading || !kase) return <div className="text-sm" style={{ color: 'var(--ink-mute)' }}>Loading case…</div>

  const isAdvisorMediated = dial?.disclosure_mode === 'Advisor-Mediated'
  const previewName = isAdvisorMediated ? `${brand?.name} Styling Advisor` : 'StyleVerse AI Assistant'

  return (
    <div className="max-w-4xl">
      <Link to="/cases" className="text-xs" style={{ color: 'var(--brand-accent)' }}>← Back to Unified Case Thread</Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{kase.id}</h1>
          <Link to={`/customers/${kase.customer.id}`} className="text-sm hover:underline" style={{ color: 'var(--brand-accent)' }}>{kase.customer.name}</Link>
          <span className="ml-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{kase.status}</span>
        </div>
        <div className="flex gap-1.5">
          <Badge variant="pii" />
          {brand && <Badge variant={MODE_BADGE[brand.ai_tooling_mode]} />}
        </div>
      </div>

      {kase.predicted_grievance && (
        <div className="mt-4 rounded-md border p-3 text-sm" style={{ borderColor: '#f3b8b8', background: '#fdece8', color: '#991b1b' }}>
          <p className="font-semibold">⚠ Grievance likely — Predictive Grievance model flagged this case.</p>
          <p className="mt-0.5 text-xs">{kase.proactive_outreach_sent ? 'Proactive outreach has already been sent.' : 'No proactive outreach sent yet.'}</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card">
          <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
            Merged Channel Log
          </h2>
          <div className="space-y-3">
            {kase.channel_log.map((m, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="w-24 shrink-0 rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
                  {m.channel}
                </span>
                <div>
                  <p>{m.message}</p>
                  <p className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>{new Date(m.timestamp).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Draft Outreach
            </h3>
            <p className="mb-2 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
              Customer will see this as: <strong>{previewName}</strong>
            </p>
            <GeminiAction endpoint="/gemini/draft-outreach" payload={{ caseId: kase.id }} label="Draft outreach message" resultTitle={previewName} />
          </div>
        </div>
      </div>
    </div>
  )
}
