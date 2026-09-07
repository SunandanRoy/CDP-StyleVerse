import { useEffect, useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { AI_TOOLING_MODE_LABELS } from '../../shared/confidence.js'

const TONE_OPTIONS = ['Energetic', 'Professional', 'Warm & Refined', 'Warm & Honest', 'Straightforward', 'Formal', 'Playful']

function Slider({ label, field, value, onCommit, hint }) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>
        <span>{label}</span>
        <span className="font-semibold" style={{ color: 'var(--ink)' }}>{local}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onMouseUp={(e) => onCommit(field, Number(e.target.value))}
        onTouchEnd={(e) => onCommit(field, Number(e.target.value))}
        className="w-full"
        style={{ accentColor: 'var(--brand-accent)' }}
      />
      {hint && <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-mute)' }}>{hint}</p>}
    </div>
  )
}

export default function AIDial() {
  const { brand, dial, updateDial } = useBrand()

  if (!brand || !dial) return <div className="text-sm" style={{ color: 'var(--ink-mute)' }}>Loading…</div>

  return (
    <div className="max-w-3xl">
      <h1 className="font-heading text-2xl font-bold">AI Involvement Dial</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>Governance settings for <strong>{brand.name}</strong>. Changes apply live across the console.</p>

      <div className="mt-5 card">
        <div className="mb-4 flex items-center justify-between rounded-md border p-3" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>AI Tooling Mode (read-only)</div>
            <div className="font-heading text-lg font-bold" title={brand.hard_limit}>{AI_TOOLING_MODE_LABELS[brand.ai_tooling_mode]}</div>
          </div>
          <span className="cursor-help rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }} title={brand.hard_limit}>
            🛈 hard limit
          </span>
        </div>
        <p className="-mt-2 mb-4 text-[11px]" style={{ color: 'var(--ink-mute)' }}>{brand.hard_limit}</p>

        <Slider label="Automation Frequency" field="automation_frequency" value={dial.automation_frequency} onCommit={(f, v) => updateDial({ [f]: v })} hint="How often the AI acts without a human trigger." />
        <Slider label="Proactivity Threshold" field="proactivity_threshold" value={dial.proactivity_threshold} onCommit={(f, v) => updateDial({ [f]: v })} hint="Lower = the system reaches out proactively sooner." />
        <Slider label="Escalation Threshold" field="escalation_threshold" value={dial.escalation_threshold} onCommit={(f, v) => updateDial({ [f]: v })} hint="Higher = more is handled before escalating to a human." />

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>Tone</label>
          <select
            value={dial.tone}
            onChange={(e) => updateDial({ tone: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--edge)' }}
          >
            {[dial.tone, ...TONE_OPTIONS.filter((t) => t !== dial.tone)].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>Disclosure Mode</label>
          <div className="flex overflow-hidden rounded-md border" style={{ borderColor: 'var(--edge)' }}>
            {['Self-Directed', 'Advisor-Mediated'].map((mode) => (
              <button
                key={mode}
                onClick={() => updateDial({ disclosure_mode: mode })}
                className="flex-1 px-3 py-2 text-sm font-medium"
                style={dial.disclosure_mode === mode ? { background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' } : { background: 'var(--surface)', color: 'var(--ink-mute)' }}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
            {dial.disclosure_mode === 'Advisor-Mediated'
              ? 'Interactions are framed as coming from a named human advisor; AI assists behind the scenes.'
              : 'Interactions are openly framed as coming from the StyleVerse AI Assistant.'}
          </p>
          <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--brand-accent)' }}>
            Toggle this, then revisit Unified Case Thread or Confidence Layer — the customer-facing wording updates live.
          </p>
        </div>
      </div>
    </div>
  )
}
