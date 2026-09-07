import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'

const STATUSES = ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed']

export default function CaseThreadList() {
  const { brandId } = useBrand()
  const [status, setStatus] = useState('')
  const params = new URLSearchParams({ brand_id: brandId })
  if (status) params.set('status', status)
  const { data: cases, loading } = useFetch(brandId ? `/cases?${params.toString()}` : null)

  return (
    <div className="max-w-4xl">
      <h1 className="font-heading text-2xl font-bold">Unified Case Thread</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>28 seeded cases merging every channel touchpoint per customer.</p>

      <div className="mt-4 flex items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {cases && <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{cases.length} cases</span>}
      </div>

      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm" style={{ color: 'var(--ink-mute)' }}>Loading…</p>}
        {cases?.map((c) => (
          <Link key={c.id} to={`/cases/${c.id}`} className="card flex items-center justify-between hover:opacity-90">
            <div>
              <div className="text-sm font-semibold">{c.customer_name}</div>
              <div className="text-xs" style={{ color: 'var(--ink-mute)' }}>{c.id} · {c.channel_log.length} messages</div>
            </div>
            <div className="flex items-center gap-2">
              {c.predicted_grievance && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: '#fdece8', color: '#b91c1c' }}>⚠ Grievance likely</span>
              )}
              <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>{c.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
