import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFetch } from '../lib/useFetch'
import { useBrand } from '../context/BrandContext'
import Badge from '../components/Badge'
import ScoreFormulaNote from '../components/ScoreFormulaNote'
import { formatDateIN } from '../../shared/sce-lib.mjs'

const MODE_BADGE = {
  full_llm: 'escalation',
  internal_llm_only: 'signoff',
  retrieval_only: 'retrieval',
  rules_engine_only: 'rules'
}

// D8 — consent tags per field. The seed carries one consent_basis per
// customer (explicit_opt_in), but not every data category actually needs
// it: order/case records are covered by contractual necessity (fulfilling
// the order/service the customer already asked for), while anything
// sensitive or cross-channel (body measurements, bridging a marketplace
// identity into this profile) requires the customer's own opt-in.
function ConsentTag({ basis }) {
  const isConsent = basis === 'explicit_opt_in'
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{ borderColor: 'var(--edge)', color: isConsent ? 'var(--brand-accent)' : 'var(--ink-mute)' }}
      title={isConsent ? 'Requires the customer\'s own explicit opt-in — sensitive or cross-channel data.' : 'Covered by contractual necessity — no separate consent required to deliver the order/service already requested.'}
    >
      {isConsent ? 'Consent: explicit opt-in' : 'Basis: contractual necessity'}
    </span>
  )
}

function TimelineRow({ entry }) {
  if (entry.type === 'order') {
    const o = entry.ref
    return (
      <div className="flex items-start gap-3 py-2">
        <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>ORDER</span>
        <div className="text-sm">
          <span className="font-medium">{o.product_name}</span> · size {o.size} · <span style={{ color: 'var(--ink-mute)' }}>{o.status} via {o.channel}</span>
          <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>{formatDateIN(o.order_date)} · {o.id}</div>
        </div>
      </div>
    )
  }
  if (entry.type === 'return') {
    const r = entry.ref
    return (
      <div className="flex items-start gap-3 py-2">
        <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>RETURN</span>
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
      <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--accent2-soft)', color: 'var(--accent2)' }}>CASE</span>
      <div className="text-sm">
        <Link to={`/cases/${c.id}`} className="font-medium hover:underline" style={{ color: 'var(--brand-accent)' }}>{c.id}</Link> ·{' '}
        <span style={{ color: 'var(--ink-mute)' }}>{c.status}{c.predicted_grievance ? ' · ⚠ grievance likely' : ''}</span>
        <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>{c.channel_log[0]?.text?.slice(0, 80)}…</div>
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
    // Prefer the most recent fit-applicable order — Accessories carry no
    // confidence score (§4), so a Live Confidence Score built off one would
    // render blank.
    const fitOrder = [...customer.orders].sort((a, b) => (a.order_date < b.order_date ? 1 : -1)).find((o) => o.fit_applicable)
    return fitOrder?.product_id || null
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
            {customer.fit_passport_bridged ? (
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--good-soft)', color: 'var(--good)' }}>
                {customer.fit_passport_status}
              </span>
            ) : (
              <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }} title="This customer is D2C-native — there is no marketplace identity to bridge.">
                {customer.fit_passport_status}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="pii" />
          {brand && <Badge variant={MODE_BADGE[brand.ai_tooling_mode]} />}
          <button
            disabled
            title="No Storefront project exists in this Console-only build — see SCE_DATA_CONTRACT.md's Console-only note. N/A by design, not a broken link."
            className="cursor-not-allowed rounded-full border px-2.5 py-0.5 text-[11px] font-medium opacity-60"
            style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}
          >
            Open storefront as this customer — N/A
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Merged Timeline · orders + returns + cases
            </h2>
            <ConsentTag basis="contractual_necessity" />
          </div>
          <div className="card divide-y" style={{ borderColor: 'var(--edge)' }}>
            {customer.timeline.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-mute)' }}>No activity yet.</p>}
            {customer.timeline.map((entry, i) => (
              <TimelineRow key={i} entry={entry} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                Fit Passport
              </h2>
              <ConsentTag basis={customer.consent_basis} />
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span style={{ color: 'var(--ink-mute)' }}>Archetype</span><span className="font-medium">{customer.fit_passport.archetype}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--ink-mute)' }}>Height</span><span className="font-medium">{customer.fit_passport.height_cm} cm</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--ink-mute)' }}>Measurements</span><span className="font-medium text-right">{customer.fit_passport.measurements}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--ink-mute)' }}>Passport confidence</span><span className="font-medium">{customer.fit_passport.confidence}%</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--ink-mute)' }}>Shopping for</span><span className="font-medium capitalize">{customer.fit_passport.shopping_for}</span></div>
            </div>
          </div>

          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                Identity Graph
              </h2>
              <ConsentTag basis={customer.marketplace_claim ? 'explicit_opt_in' : 'contractual_necessity'} />
            </div>
            <div className="flex flex-col items-stretch gap-1.5 text-xs">
              <div className="rounded-md border p-2" style={{ borderColor: 'var(--brand-accent)', background: 'var(--brand-accent-soft)' }}>
                <div className="font-semibold">D2C Profile</div>
                <div style={{ color: 'var(--ink-mute)' }}>{customer.name} · {customer.id}</div>
              </div>
              <div className="pl-3 text-[10px]" style={{ color: 'var(--ink-mute)' }}>↓ loyalty_id</div>
              <div className="rounded-md border p-2" style={{ borderColor: 'var(--edge)' }}>
                <div className="font-semibold">Loyalty Account</div>
                <div style={{ color: 'var(--ink-mute)' }}>{customer.loyalty_id || 'Not enrolled'}</div>
              </div>
              <div className="pl-3 text-[10px]" style={{ color: 'var(--ink-mute)' }}>↓ marketplace bridge</div>
              {customer.marketplace_claim ? (
                <div className="rounded-md border p-2" style={{ borderColor: customer.marketplace_claim.claimed_by ? 'var(--good-border)' : 'var(--warn-border)', background: customer.marketplace_claim.claimed_by ? 'var(--good-soft)' : 'var(--warn-soft)' }}>
                  <div className="font-semibold">Marketplace Alias</div>
                  <div style={{ color: 'var(--ink-mute)' }}>{customer.marketplace_claim.buyer_alias}</div>
                  <div className="mt-0.5 font-medium" style={{ color: customer.marketplace_claim.claimed_by ? 'var(--good)' : 'var(--warn)' }}>
                    {customer.marketplace_claim.claimed_by ? '✓ Bridged' : '⏳ Claim pending'}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border p-2" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
                  No marketplace alias linked — D2C-native identity.
                </div>
              )}
              {customer.marketplace_bridge_bonus_points && (
                <p className="mt-1 text-[10px]" style={{ color: 'var(--good)' }}>+{customer.marketplace_bridge_bonus_points} loyalty points awarded on bridge ({formatDateIN(customer.marketplace_bridge_date)}).</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              Live Confidence Score
            </h2>
            {confidence ? (
              <>
                <div className="font-heading text-3xl font-bold" style={{ color: 'var(--brand-accent)' }}>{confidence.confidence_score}%</div>
                <p className="mt-1 text-xs" style={{ color: 'var(--ink-mute)' }}>Based on most recent order + archetype: {customer.fit_passport.archetype}</p>
                <div className="mt-2">
                  <ScoreFormulaNote signals={confidence} />
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--ink-mute)' }}>No orders yet to compute a live score.</p>
            )}
          </div>

          <div className="card">
            <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              AI Components Touching This Customer's Data
            </h2>
            <p className="mb-2 text-[11px]" style={{ color: 'var(--ink-mute)' }}>From the Model Registry — hover a chip for its explainability method.</p>
            <div className="flex flex-wrap gap-1.5">
              {registry?.slice(0, 4).map((m) => (
                <span key={m.id} className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }} title={m.notes}>
                  {m.name}
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
