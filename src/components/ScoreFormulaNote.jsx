import { useState } from 'react'
import { CONFIDENCE_FORMULA_TEXT, confidenceFormulaBreakdown } from '../../shared/confidence.js'

export default function ScoreFormulaNote({ signals }) {
  const [open, setOpen] = useState(false)
  const breakdown = signals ? confidenceFormulaBreakdown(signals) : null

  return (
    <div className="text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 font-medium underline decoration-dotted"
        style={{ color: 'var(--brand-accent)' }}
      >
        {open ? '▾' : '▸'} How is this calculated?
      </button>
      {open && (
        <div className="mt-2 rounded-md border p-3 text-xs leading-relaxed" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)', color: 'var(--ink-mute)' }}>
          <p className="mb-2 font-mono" style={{ color: 'var(--ink)' }}>{CONFIDENCE_FORMULA_TEXT}</p>
          {breakdown && (
            <ul className="space-y-1">
              <li>0.5 × {signals.fit_match_pct}% (fit-match) = {breakdown.fitTerm.toFixed(1)}</li>
              <li>0.3 × {signals.social_proof_kept_it_rate}% (social-proof kept-it rate) = {breakdown.socialTerm.toFixed(1)}</li>
              <li>0.2 × (100 − {signals.hesitation_penalty}) (hesitation) = {breakdown.hesitationTerm.toFixed(1)}</li>
              <li className="mt-1 font-semibold" style={{ color: 'var(--ink)' }}>= {breakdown.score}% confidence</li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
