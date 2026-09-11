import { useState } from 'react'

const LOGIC = `IF reason_code == "fit"
   AND corrected_size_confidence > 55%
   AND corrected_size_in_stock
THEN render pre-filled exchange offer
ELSE standard return confirmation`

export default function DecisionLogicNote() {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 font-medium underline decoration-dotted"
        style={{ color: 'var(--brand-accent)' }}
      >
        {open ? '▾' : '▸'} How does interception logic decide?
      </button>
      {open && (
        <pre
          className="mt-2 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed"
          style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)', color: 'var(--ink)' }}
        >
          {LOGIC}
        </pre>
      )}
    </div>
  )
}
