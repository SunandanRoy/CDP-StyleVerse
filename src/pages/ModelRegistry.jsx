import { Fragment, useState } from 'react'
import { useFetch } from '../lib/useFetch'
import { useBrand } from '../context/BrandContext'
import Badge from '../components/Badge'
import CalibrationChart from '../components/CalibrationChart'
import { formatDateIN } from '../../shared/sce-lib.mjs'

const BADGES_BY_MODEL = {
  model_confidence: ['pii', 'escalation'],
  model_archetype: ['pii'],
  model_interception: ['rules'],
  model_case_triage: ['rag', 'signoff', 'escalation'],
  model_voice_rubric: ['signoff', 'rag'],
  model_grievance: ['pii', 'escalation'],
  model_signal: ['rag', 'retrieval']
}

export default function ModelRegistry() {
  const { brandId, brand } = useBrand()
  const { data: registry, loading } = useFetch('/model-registry')
  const { data: registryComponents } = useFetch(brandId ? `/registry-components?brand_id=${brandId}` : null)
  const { data: dialAuditLog } = useFetch(brandId ? `/dial-audit-log?brand_id=${brandId}` : null)
  const [expanded, setExpanded] = useState(null)
  const { data: calibration, loading: calibrationLoading } = useFetch(expanded === 'model_confidence' ? '/confidence-calibration' : null)

  const watchList = registryComponents?.filter((c) => c.automation_bias_watch) || []

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">Model Registry</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        The {registry?.length ?? 7} governed AI/decision components behind the console. Click a row for details.
        {dialAuditLog && <> · <span title="Every historical AI Involvement Dial change for this brand, each with a required reason (C13).">{dialAuditLog.length} Dial changes logged for {brand?.name}</span></>}
      </p>

      {watchList.length > 0 && (
        <div className="mt-4 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--warn-border)', background: 'var(--warn-soft)', color: 'var(--warn-strong)' }}>
          <p className="font-semibold">⚠ Automation-bias watch — {brand?.name}</p>
          {watchList.map((c) => (
            <p key={c.id} className="mt-1 text-xs">
              <strong>{c.component}</strong>: override rate {c.override_rate}% sits below the 15–30% healthy band ({c.overrides} overrides of {c.ai_suggestions} AI suggestions) — this reads as automation bias (staff rubber-stamping the suggestion without scrutiny), the exact failure mode Override Wins is designed to surface. Remediation: spot-audit a sample of unreviewed suggestions from this component with the owning sub-team.
            </p>
          ))}
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
        <table className="w-full min-w-[760px] text-sm">
          <thead style={{ background: 'var(--surface-alt)' }}>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              <th className="px-3 py-2">Component</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last Validated</th>
              <th className="px-3 py-2">Override Rate</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: 'var(--ink-mute)' }}>Loading…</td></tr>}
            {registry?.map((m) => (
              <Fragment key={m.id}>
                <tr
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  className="cursor-pointer border-t"
                  style={{ borderColor: 'var(--edge)', background: expanded === m.id ? 'var(--brand-accent-soft)' : 'transparent' }}
                >
                  <td className="px-3 py-2 font-medium">{m.name}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{m.version}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={m.status === 'Production' ? { background: 'var(--good-soft)', color: 'var(--good)' } : { background: 'var(--neutral-soft)', color: 'var(--neutral)' }}>{m.status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{formatDateIN(m.last_validated)}</td>
                  <td className="px-3 py-2 text-xs">{m.override_rate != null ? `${m.override_rate}%` : '—'}</td>
                </tr>
                {expanded === m.id && (
                  <tr style={{ background: 'var(--surface-alt)' }}>
                    <td colSpan={5} className="px-4 py-4">
                      <p className="text-sm" style={{ color: 'var(--ink)' }}>{m.notes}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--ink-mute)' }}>Owner: {m.owner}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(BADGES_BY_MODEL[m.id] || []).map((b) => <Badge key={b} variant={b} />)}
                      </div>
                      {m.id === 'model_confidence' && (
                        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--edge)' }}>
                          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Calibration — all brands</h4>
                          <CalibrationChart data={calibration} loading={calibrationLoading} />
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
          Prototype → Production Roadmap
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
          Stated honestly rather than glossed over — every component here is a deliberate prototype-scope substitute, not a hidden gap.
        </p>
        <div className="overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
          <table className="w-full min-w-[720px] text-sm">
            <thead style={{ background: 'var(--surface-alt)' }}>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">Prototype (this build)</th>
                <th className="px-3 py-2">Production</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTION_DELTAS.map((row) => (
                <tr key={row.area} className="border-t align-top" style={{ borderColor: 'var(--edge)' }}>
                  <td className="px-3 py-2 font-medium">{row.area}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{row.prototype}</td>
                  <td className="px-3 py-2 text-xs">{row.production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
          Known Risks &amp; Mitigations
        </h2>
        <div className="space-y-2">
          {RISKS.map((r) => (
            <div key={r.risk} className="card flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
              <div className="text-sm font-medium sm:w-64 sm:shrink-0">{r.risk}</div>
              <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>{r.mitigation}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PRODUCTION_DELTAS = [
  { area: 'Data layer', prototype: 'Seed JSON in memory', production: 'Warehouse-native CDP (Snowflake/BigQuery, Kafka, RudderStack/Snowplow SDKs, Feast, Hightouch reverse-ETL)' },
  { area: 'Confidence model', prototype: 'Deterministic weighted formula', production: 'LightGBM/XGBoost propensity model, SHAP explainability, weekly retraining, calibration curves' },
  { area: 'Fit rendering', prototype: '2D pre-drawn archetype silhouettes', production: 'Thin-plate-spline / diffusion image-to-image warping on real product photography; photorealism deferred' },
  { area: 'Return reason', prototype: 'Seeded reason codes', production: 'Fine-tuned distilled-BERT text classifier on free-text return reasons' },
  { area: 'Case brief', prototype: 'Direct LLM call / local template', production: 'RAG over CDP records + vector store; frontier model for briefs, small open-weight models for routing' },
  { area: 'Grievance prediction', prototype: 'Seeded flags', production: 'Anomaly detection / threshold model over delivery event streams' },
  { area: 'AI Involvement Dial', prototype: 'Global state object', production: 'Feature-flag/config service (LaunchDarkly-style), audited at Risk & Ethics Board cadence' },
  { area: 'Access', prototype: 'Open, no auth', production: 'RBAC per sub-team' },
  { area: 'Serving', prototype: 'N/A — in-memory, instant', production: 'Sub-200ms inference budget so page load is not degraded' }
]

const RISKS = [
  { risk: 'Gemini rate-limit or outage mid-demo', mitigation: 'Key check at server start, 8s timeout, pre-emptive rate counter, per-function canned response labelled (example response) — never a blank box or red error.' },
  { risk: 'Brand config drift between modules', mitigation: 'Single global brand config; one ai_tooling_mode enum, not overlapping booleans; no per-component brand logic.' },
  { risk: 'Dial toggles state but not visible output', mitigation: 'Shared wording helper reads Dial state; cross-module check (Modules 2 and 6 reword live on toggle).' },
  { risk: 'Broken product images', mitigation: 'Startup HEAD check on the image library, plus a client-side fallback placeholder — zero broken images regardless of upstream link staleness.' },
  { risk: 'confidence_adjustment_log reads as decoration', mitigation: '≥1 entry\'s "new" value is required to match the current live fit matrix — verifiable, not asserted.' },
  { risk: 'Marketplace platforms decline size-matched image serving (production)', mitigation: 'Text-based sizing badge designed as Plan B; treated as upside, not a dependency.' },
  { risk: 'Case-brief hallucination in production', mitigation: 'RAG grounding, human-in-the-loop above Tier 1, "verify before acting" stamp on every brief.' }
]
