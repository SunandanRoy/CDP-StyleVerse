import { useMemo, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'

const COLUMNS = [
  { key: 'employee_name', label: 'Employee' },
  { key: 'sub_team', label: 'Sub-team' },
  { key: 'brand_id', label: 'Brand' },
  { key: 'ai_suggestion', label: 'AI Suggestion Overridden' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'date', label: 'Date' }
]

export default function OverrideWins() {
  const { brands } = useBrand()
  const [brandFilter, setBrandFilter] = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const params = new URLSearchParams()
  if (brandFilter) params.set('brand_id', brandFilter)
  const { data: rows, loading } = useFetch(`/override-wins?${params.toString()}`)

  const brandName = (id) => brands.find((b) => b.id === id)?.name || id

  const sorted = useMemo(() => {
    if (!rows) return []
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = sortKey === 'brand_id' ? brandName(a.brand_id) : a[sortKey]
      const bv = sortKey === 'brand_id' ? brandName(b.brand_id) : b[sortKey]
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDir]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="max-w-6xl">
      <h1 className="font-heading text-2xl font-bold">Override Wins</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>16 seeded cases where a human overrode an AI suggestion, with the outcome.</p>

      <div className="mt-4 card">
        <p className="text-sm">
          <strong>Healthy override band: 15–30%.</strong> Below 15% signals automation bias — people rubber-stamping AI suggestions without scrutiny. Above 30% signals the model isn't trusted, or isn't good.
        </p>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-mute)' }}>
          Governance note: no punitive performance-rating linkage to AI-collaboration metrics in Year 1. Overrides are logged and celebrated by name — specific, visible feedback on skill exercised, not an opaque aggregate score.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--edge)' }}>
          <option value="">All brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {rows && <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{rows.length} entries</span>}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
        <table className="w-full min-w-[820px] text-sm">
          <thead style={{ background: 'var(--surface-alt)' }}>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              {COLUMNS.map((col) => (
                <th key={col.key} onClick={() => toggleSort(col.key)} className="cursor-pointer select-none px-3 py-2">
                  {col.label} {sortKey === col.key && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center" style={{ color: 'var(--ink-mute)' }}>Loading…</td></tr>}
            {sorted.map((r) => (
              <tr key={r.id} className="border-t align-top" style={{ borderColor: 'var(--edge)' }}>
                <td className="px-3 py-2 font-medium">{r.employee_name}</td>
                <td className="px-3 py-2 text-xs">{r.sub_team}</td>
                <td className="px-3 py-2 text-xs">{brandName(r.brand_id)}</td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>
                  <div className="font-medium" style={{ color: 'var(--ink)' }}>{r.ai_suggestion}</div>
                  <div>{r.override_reason}</div>
                </td>
                <td className="px-3 py-2 text-xs">{r.outcome}</td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
