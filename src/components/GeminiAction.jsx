import { useState } from 'react'
import { api } from '../lib/api'

/**
 * Reusable wiring for the 4 Gemini call sites. Button-click only (never on
 * page load), max ~8s loading state, and a labeled result that always
 * degrades gracefully — never blank, never a raw error banner.
 */
export default function GeminiAction({ endpoint, payload, label, resultTitle = 'Result' }) {
  const [state, setState] = useState('idle') // idle | loading | done
  const [result, setResult] = useState(null)

  const run = async () => {
    setState('loading')
    try {
      const res = await api.post(endpoint, payload)
      setResult(res)
    } catch (err) {
      setResult({ success: true, text: 'Something went wrong generating this — please try again.', example: true })
    } finally {
      setState('done')
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={state === 'loading'}
        className="rounded-md px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: 'var(--brand-accent)' }}
      >
        {state === 'loading' ? 'Generating…' : label}
      </button>

      {result && (
        <div className="mt-3 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              {resultTitle}
            </span>
            <div className="flex items-center gap-1.5">
              {result.label && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>
                  {result.label}
                </span>
              )}
              {result.example && (
                <span className="cursor-help rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }} title={result.note || 'Live AI call unavailable — showing a representative example response.'}>
                  (example response)
                </span>
              )}
            </div>
          </div>
          <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--ink)' }}>
            {result.text}
          </p>
        </div>
      )}
    </div>
  )
}
