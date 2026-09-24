import { useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { exportToCsv } from '../lib/csv'
import { formatDateIN } from '../../shared/sce-lib.mjs'
import KpiCard from '../components/KpiCard'

const FIT_VALUE_LABELS = {
  true_to_size: 'True to size',
  runs_tight: 'Runs tight',
  runs_loose: 'Runs loose'
}
function fitValueLabel(value) {
  return FIT_VALUE_LABELS[value] || value
}

const HOTLIST_COLUMNS = [
  { label: 'Product', key: 'product_name' },
  { label: 'Category', key: 'category' },
  { label: 'Archetype', key: 'archetype_id' },
  { label: 'Zone', key: 'zone' },
  { label: 'Return rate %', key: 'return_rate_pct' },
  { label: 'Returns', key: 'return_count' },
  { label: 'Orders', key: 'order_count' },
  { label: 'Dominant direction', key: 'dominant_direction' },
  { label: 'Current fit-matrix value', key: 'current_value' },
  { label: 'Suggested value', key: 'suggested_value' }
]

function ProposeRow({ row, brandId, onApplied, archetypeLabel }) {
  const [proposing, setProposing] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await api.post('/fit-matrix/adjustments', {
        category: row.category, archetype_id: row.archetype_id, zone: row.zone,
        new_value: row.suggested_value, reason: reason.trim(), approver: 'Customer Analytics'
      })
      toast.success('Adjustment approved — Confidence Layer recomputes with this value immediately')
      onApplied()
    } catch (err) {
      toast.error('Could not apply adjustment — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <tr className="border-t" style={{ borderColor: 'var(--edge)' }}>
      <td className="px-3 py-2">
        <div className="font-medium">{row.product_name}</div>
        <div className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>{row.category} · {archetypeLabel(row.archetype_id)} · {row.zone}</div>
      </td>
      <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--warn)' }}>{row.return_rate_pct}%</td>
      <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{row.return_count} of {row.order_count} orders · runs {row.dominant_direction}</td>
      <td className="px-3 py-2 text-xs">
        <span className="rounded px-1.5 py-0.5" style={{ background: 'var(--surface-alt)' }}>{fitValueLabel(row.current_value)}</span>
        {' → '}
        <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>{fitValueLabel(row.suggested_value)}</span>
      </td>
      <td className="px-3 py-2">
        {!proposing ? (
          <button onClick={() => setProposing(true)} className="rounded-md border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: 'var(--edge)' }}>
            Propose adjustment
          </button>
        ) : (
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (required)…"
              className="rounded-md border px-2 py-1 text-xs"
              style={{ borderColor: 'var(--edge)' }}
            />
            <button onClick={submit} disabled={!reason.trim() || loading} className="rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50" style={{ background: 'var(--good)', color: '#fff' }}>
              {loading ? 'Approving…' : 'Approve as Customer Analytics'}
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function FeedbackLoop() {
  const { brand, brandId } = useBrand()
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: hotlist, loading } = useFetch(brandId ? `/fit-matrix/hotlist?brand_id=${brandId}&_r=${refreshKey}` : null)
  const { data: adjustmentLog } = useFetch(`/confidence-adjustment-log?_r=${refreshKey}`)
  const { data: archetypes } = useFetch('/archetypes')
  const [sending, setSending] = useState(false)

  const archetypeLabel = (id) => archetypes?.find((a) => a.id === id)?.label || id

  const onApplied = () => setRefreshKey((k) => k + 1)

  const sendToMerchandising = async () => {
    if (!hotlist?.length) return
    setSending(true)
    try {
      const summary = `SKU hot-list for ${brand.name}: ${hotlist.length} product×archetype×zone cells with return rates above target, led by ${hotlist[0].product_name} (${hotlist[0].archetype_id}, ${hotlist[0].zone}) at ${hotlist[0].return_rate_pct}%.`
      await api.post('/signal-insights', { brand_id: brandId, insight_text: summary, sent_to: 'Merchandising & Design' })
      exportToCsv(`fit-matrix-hotlist-${brandId}.csv`, hotlist, HOTLIST_COLUMNS)
      toast.success('Sent to Merchandising & Design — CSV downloaded')
    } catch (err) {
      toast.error('Could not send — try again')
    } finally {
      setSending(false)
    }
  }

  if (!brand) return null

  return (
    <div className="max-w-6xl">
      <h1 className="font-heading text-2xl font-bold">Closed Feedback Loop — {brand.name}</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        SKU hot-list by return rate × archetype × zone, mined from fit-driven returns. Approve an adjustment and the Confidence Layer recomputes with it on the very next score.
      </p>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
        Order volumes shown here reflect the current dataset and will grow as more orders and returns come in.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Cells above target" value={loading ? '…' : hotlist?.length ?? 0} accent />
        <KpiCard label="Adjustments approved (all brands)" value={adjustmentLog?.length ?? 0} />
        <KpiCard label="Top return rate" value={hotlist?.[0] ? `${hotlist[0].return_rate_pct}%` : '—'} />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>SKU Hot-List</h2>
        <button onClick={sendToMerchandising} disabled={!hotlist?.length || sending} className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
          {sending ? 'Sending…' : 'Send to Merchandising & Design (CSV)'}
        </button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
        <table className="w-full min-w-[820px] text-sm">
          <thead style={{ background: 'var(--surface-alt)' }}>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              <th className="px-3 py-2">SKU × archetype × zone</th>
              <th className="px-3 py-2 text-right">Return rate</th>
              <th className="px-3 py-2">Signal</th>
              <th className="px-3 py-2">Fit-matrix value</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: 'var(--ink-mute)' }}>Loading…</td></tr>}
            {!loading && (hotlist?.length ?? 0) === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: 'var(--ink-mute)' }}>No cells above target for {brand.name} right now — the fit matrix is tracking well.</td></tr>
            )}
            {hotlist?.map((row) => (
              <ProposeRow key={`${row.product_id}|${row.archetype_id}|${row.zone}`} row={row} brandId={brandId} onApplied={onApplied} archetypeLabel={archetypeLabel} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Adjustment Log</h2>
        <div className="space-y-1.5 text-xs">
          {adjustmentLog?.slice(0, 8).map((a) => (
            <div key={a.id} className="card !py-2 !px-3">
              <span className="font-medium">{a.category} · {archetypeLabel(a.archetype_id)} · {a.zone}</span>
              <span style={{ color: 'var(--ink-mute)' }}> — {fitValueLabel(a.old_value)} → {fitValueLabel(a.new_value)} · {a.reason} · {formatDateIN(a.date)} · approved by {a.approver}</span>
            </div>
          ))}
          {(!adjustmentLog || adjustmentLog.length === 0) && <p style={{ color: 'var(--ink-mute)' }}>No adjustments yet.</p>}
        </div>
      </div>
    </div>
  )
}
