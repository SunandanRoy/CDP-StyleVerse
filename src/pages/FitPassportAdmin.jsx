import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import FitModel from '../components/FitModel/FitModel.jsx'
import { CATEGORIES } from '../../shared/confidence.js'

export default function FitPassportAdmin() {
  const { archetypeId: routeArchetypeId } = useParams()
  const navigate = useNavigate()
  const { brandId, dial } = useBrand()
  const { data: archetypes } = useFetch('/archetypes')
  const [category, setCategory] = useState(CATEGORIES[0])

  const selected = routeArchetypeId || archetypes?.[0]?.id
  const archetype = archetypes?.find((a) => a.id === selected)
  const isAdvisorMediated = dial?.disclosure_mode === 'Advisor-Mediated'

  const { data: members } = useFetch(selected && brandId ? `/customers?brand_id=${brandId}&archetype_id=${selected}` : null)
  const { data: adjustmentLog } = useFetch(selected ? `/confidence-adjustment-log?archetype_id=${selected}` : null)

  useEffect(() => {
    if (!routeArchetypeId && archetypes?.length) navigate(`/fit-passport/${archetypes[0].id}`, { replace: true })
  }, [routeArchetypeId, archetypes, navigate])

  return (
    <div className="max-w-6xl">
      <h1 className="font-heading text-2xl font-bold">Fit Passport Administration</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        Browse archetypes with live membership counts, inspect an individual Fit Passport, and trace it back to the confidence_adjustment_log.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {archetypes?.map((a) => (
          <button
            key={a.id}
            onClick={() => navigate(`/fit-passport/${a.id}`)}
            className="rounded-md border p-2.5 text-left"
            style={{
              borderColor: a.id === selected ? 'var(--brand-accent)' : 'var(--edge)',
              background: a.id === selected ? 'var(--brand-accent-soft)' : 'var(--surface)'
            }}
          >
            <div className="text-xs font-semibold">{a.label}</div>
            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--ink-mute)' }}>{a.member_count} customers</div>
          </button>
        ))}
      </div>

      {archetype && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="card">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-heading text-lg font-bold">{archetype.label}</h2>
                <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>{archetype.measurement_range}</p>
              </div>
              <span
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}
                title={isAdvisorMediated ? 'This preview simulates the human-advisor-framed experience — no AI badge shown, per this brand\'s hard limit.' : 'This preview simulates what the shopper sees, including AI-disclosure watermarking.'}
              >
                Customer View Preview · {isAdvisorMediated ? '🧑 Advisor-Mediated' : '🛈 AI-disclosed'}
              </span>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{
                    borderColor: c === category ? 'var(--brand-accent)' : 'var(--edge)',
                    background: c === category ? 'var(--brand-accent-soft)' : 'transparent',
                    color: c === category ? 'var(--brand-accent)' : 'var(--ink-mute)'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <FitModel archetypeId={selected} productCategory={category} confidenceScore={78} heightPx={380} suppressAiBadge={isAdvisorMediated} />
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                Members ({members?.length ?? 0})
              </h3>
              <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin text-xs">
                {members?.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 border-b py-1" style={{ borderColor: 'var(--edge)' }}>
                    <span className="truncate">{m.name}</span>
                    <span className="shrink-0 text-right" style={{ color: 'var(--ink-mute)' }}>
                      {m.loyalty_id ? 'bridged' : m.channels[0]} · shopping for {m.fit_passport.shopping_for}
                    </span>
                  </div>
                ))}
                {members?.length === 0 && <p style={{ color: 'var(--ink-mute)' }}>No customers of this archetype for the selected brand.</p>}
              </div>
            </div>

            <div className="card">
              <h3 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                Confidence Adjustment Log
              </h3>
              {adjustmentLog?.length ? (
                <ul className="space-y-2 text-xs">
                  {adjustmentLog.map((entry) => (
                    <li key={entry.id} className="border-b pb-2" style={{ borderColor: 'var(--edge)' }}>
                      <div className="font-semibold">{entry.category} · {entry.zone}</div>
                      <div style={{ color: 'var(--ink-mute)' }}>
                        {entry.old_value.replaceAll('_', ' ')} → <strong>{entry.new_value.replaceAll('_', ' ')}</strong> · {entry.date}
                      </div>
                      <div className="mt-0.5" style={{ color: 'var(--ink-mute)' }}>{entry.reason}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>No adjustments logged for this archetype yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
