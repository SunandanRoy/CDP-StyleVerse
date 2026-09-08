import { useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useFetch } from '../lib/useFetch'
import { api } from '../lib/api'

function parseVerdict(text) {
  const verdictMatch = text.match(/VERDICT:\s*(Pass|Fail)/i)
  const reasonMatch = text.match(/REASON:\s*(.+)/is)
  return {
    verdict: verdictMatch ? verdictMatch[1] : 'Pass',
    reason: reasonMatch ? reasonMatch[1].trim() : text
  }
}

export default function BrandVoiceCertification() {
  const { brand, brandId, brands } = useBrand()
  const [draft, setDraft] = useState('')
  const [historyFilter, setHistoryFilter] = useState(brandId)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const historyParams = new URLSearchParams({ _r: String(refreshKey) })
  if (historyFilter) historyParams.set('brand_id', historyFilter)
  const { data: history } = useFetch(`/certification-history?${historyParams.toString()}`)

  const runCertify = async () => {
    if (!draft.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await api.post('/gemini/certify-voice', { draftText: draft, brandId })
      const { verdict, reason } = parseVerdict(res.text)
      setResult({ ...res, verdict, reason })
      await api.post('/certification-history', { brand_id: brandId, draft_excerpt: draft.slice(0, 140), verdict, reason })
      setRefreshKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-heading text-2xl font-bold">Brand Voice Certification</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>Certify a draft agent reply against <strong>{brand?.name}</strong>'s voice guide.</p>

      <div className="mt-5 card">
        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>Draft reply</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Paste or write a draft agent reply to certify…"
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--edge)' }}
        />
        <button
          onClick={runCertify}
          disabled={loading || !draft.trim()}
          className="mt-3 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--brand-accent)' }}
        >
          {loading ? 'Certifying…' : 'Certify'}
        </button>

        {result && (
          <div className="mt-4 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={result.verdict === 'Pass' ? { background: '#e4f7e9', color: '#15803d' } : { background: '#fdece8', color: '#b91c1c' }}
              >
                {result.verdict}
              </span>
              {result.label && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>{result.label}</span>}
              {result.example && <span className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }} title={result.note}>(example response)</span>}
            </div>
            <p style={{ color: 'var(--ink)' }}>{result.reason}</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Certification History</h2>
          <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} className="rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--edge)' }}>
            <option value="">All brands</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border scrollbar-thin" style={{ borderColor: 'var(--edge)' }}>
          <table className="w-full min-w-[560px] text-sm">
            <thead style={{ background: 'var(--surface-alt)' }}>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
                <th className="px-3 py-2">Draft</th>
                <th className="px-3 py-2">Verdict</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {history?.map((h) => (
                <tr key={h.id} className="border-t" style={{ borderColor: 'var(--edge)' }}>
                  <td className="max-w-xs truncate px-3 py-2 text-xs">{h.draft_excerpt}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={h.verdict === 'Pass' ? { background: '#e4f7e9', color: '#15803d' } : { background: '#fdece8', color: '#b91c1c' }}>{h.verdict}</span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{h.reason}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--ink-mute)' }}>{h.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
