import { Fragment, useState } from 'react'
import { useFetch } from '../lib/useFetch'
import Badge from '../components/Badge'

const BADGES_BY_MODEL = {
  model_confidence_layer: ['pii', 'escalation'],
  model_fit_archetype: ['pii'],
  model_return_reason: ['pii'],
  model_case_brief_rag: ['rag', 'signoff', 'escalation'],
  model_predictive_grievance: ['pii', 'escalation'],
  model_marketplace_signal: ['rag', 'retrieval'],
  model_ai_dial: ['rules'],
  model_brand_voice: ['signoff', 'rag']
}

const DESCRIPTIONS = {
  model_confidence_layer: 'Combines fit-match, social proof, and hesitation signals into the single confidence score shown across the console — a transparent formula, not a black-box model.',
  model_fit_archetype: 'Matches a customer to the closest of 10 body archetypes and looks up zone-level fit direction from the live fit matrix.',
  model_return_reason: 'Classifies free-text and structured return reasons into standard categories to power the Return Reason Decoder.',
  model_case_brief_rag: 'Drafts outreach and case summaries by retrieving real order/case context and generating a short, brand-appropriate message.',
  model_predictive_grievance: 'Flags cases likely to escalate into a grievance before the customer complains, based on channel-log patterns.',
  model_marketplace_signal: 'Clusters marketplace reviews and summarizes the most actionable fit/sizing pattern for Merchandising & Design.',
  model_ai_dial: 'A configuration service, not a model — stores and serves each brand\'s governance settings (automation, tone, thresholds, disclosure).',
  model_brand_voice: 'Scores a draft agent reply against a brand\'s tone guide and returns a pass/fail verdict with reasoning.'
}

export default function ModelRegistry() {
  const { data: registry, loading } = useFetch('/model-registry')
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">Model Registry</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>The 8 governed AI/ML components behind the console. Click a row for details.</p>

      <div className="mt-5 overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
        <table className="w-full min-w-[760px] text-sm">
          <thead style={{ background: 'var(--surface-alt)' }}>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              <th className="px-3 py-2">Component</th>
              <th className="px-3 py-2">Model Type</th>
              <th className="px-3 py-2">Tier</th>
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
                  <td className="px-3 py-2 font-medium">{m.component_name}</td>
                  <td className="px-3 py-2 text-xs">{m.model_type}</td>
                  <td className="px-3 py-2 text-xs">{m.tier}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{m.last_validated}</td>
                  <td className="px-3 py-2 text-xs">{m.override_rate}%</td>
                </tr>
                {expanded === m.id && (
                  <tr style={{ background: 'var(--surface-alt)' }}>
                    <td colSpan={5} className="px-4 py-4">
                      <p className="text-sm" style={{ color: 'var(--ink)' }}>{DESCRIPTIONS[m.id]}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--ink-mute)' }}>Explainability method: {m.explainability_method}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(BADGES_BY_MODEL[m.id] || []).map((b) => <Badge key={b} variant={b} />)}
                      </div>
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
