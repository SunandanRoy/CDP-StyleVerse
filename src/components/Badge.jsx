const VARIANTS = {
  rag: { text: 'RAG-grounded, no free generation', color: 'var(--teal)', bg: 'var(--teal-soft)' },
  pii: { text: 'PII isolated', color: 'var(--accent2)', bg: 'var(--accent2-soft)' },
  escalation: { text: 'Human escalation available', color: 'var(--good)', bg: 'var(--good-soft)' },
  signoff: { text: 'Human sign-off required', color: 'var(--gold)', bg: 'var(--gold-soft)' },
  retrieval: { text: 'Retrieval-only, zero-hallucination', color: 'var(--sage)', bg: 'var(--sage-soft)' },
  rules: { text: 'Rules-engine, no LLM', color: 'var(--slate)', bg: 'var(--slate-soft)' }
}

export default function Badge({ variant, children, className = '' }) {
  const v = VARIANTS[variant]
  if (!v) {
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`} style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
        {children}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
      style={{ background: v.bg, color: v.color }}
      title={v.text}
    >
      {children || v.text}
    </span>
  )
}

export function badgesForModelType(modelType) {
  const badges = []
  if (/RAG/i.test(modelType)) badges.push('rag')
  if (/anomaly|classifier|clustering/i.test(modelType)) badges.push('pii')
  return badges
}
