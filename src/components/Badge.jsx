const VARIANTS = {
  rag: { text: 'RAG-grounded, no free generation', color: '#0e7490', bg: '#e0f6fa' },
  pii: { text: 'PII isolated', color: '#7c3aed', bg: '#f1e9fe' },
  escalation: { text: 'Human escalation available', color: '#15803d', bg: '#e4f7e9' },
  signoff: { text: 'Human sign-off required', color: '#a6802f', bg: '#f4efe4' },
  retrieval: { text: 'Retrieval-only, zero-hallucination', color: '#5c8a5c', bg: '#eaf3ea' },
  rules: { text: 'Rules-engine, no LLM', color: '#334155', bg: '#edf0f4' }
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
