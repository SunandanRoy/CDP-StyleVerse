import { useEffect, useRef, useState } from 'react'
import { subscribeToast } from '../lib/toast'

const ICONS = { success: '✓', error: '⚠', info: 'ℹ' }
const ACCENT = { success: 'var(--good)', error: 'var(--bad)', info: 'var(--info)' }

export default function ToastHost() {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = (id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }

  useEffect(() => {
    return subscribeToast((entry) => {
      setToasts((ts) => [...ts, entry])
      const timer = setTimeout(() => dismiss(entry.id), entry.duration)
      timers.current.set(entry.id, timer)
    })
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="toast-enter glass pointer-events-auto flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm"
          style={{ borderLeft: `3px solid ${ACCENT[t.type] || ACCENT.info}`, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.35)' }}
        >
          <span className="mt-0.5 shrink-0 text-sm font-bold" style={{ color: ACCENT[t.type] || ACCENT.info }} aria-hidden="true">
            {ICONS[t.type] || ICONS.info}
          </span>
          <span className="min-w-0 flex-1" style={{ color: 'var(--ink)' }}>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-xs"
            style={{ color: 'var(--ink-mute)' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
