import { useEffect, useState } from 'react'
import { getGeminiKeyGlobal, setGeminiKeyGlobal, GEMINI_KEY_APPLIES } from '../lib/geminiKeyStore'
import { isLiveSyncEnabled, setLiveSyncEnabled, subscribeLiveSync } from '../lib/liveSync'
import { toast } from '../lib/toast'

export default function SettingsDrawer({ open, onClose }) {
  const [keyInput, setKeyInput] = useState('')
  const [hasKey, setHasKey] = useState(Boolean(getGeminiKeyGlobal()))
  const [liveSync, setLiveSync] = useState(isLiveSyncEnabled())
  const [eventCount, setEventCount] = useState(0)

  useEffect(() => {
    if (open) setKeyInput('')
  }, [open])

  useEffect(() => {
    if (!liveSync) return
    return subscribeLiveSync(() => setEventCount((n) => n + 1))
  }, [liveSync])

  const toggleLiveSync = () => {
    const next = !liveSync
    setLiveSyncEnabled(next)
    setLiveSync(next)
    setEventCount(0)
    toast.info(next ? 'Live Sync on — listening for storefront activity.' : 'Live Sync off.')
  }

  if (!open) return null

  const save = () => {
    setGeminiKeyGlobal(keyInput.trim())
    setHasKey(Boolean(keyInput.trim()))
    toast.success(keyInput.trim() ? 'Gemini key set for this session (memory only, not saved).' : 'Gemini key cleared.')
    setKeyInput('')
  }

  const clear = () => {
    setGeminiKeyGlobal(null)
    setHasKey(false)
    toast.info('Gemini key cleared — AI actions fall back to rules-engine/example responses.')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(10,10,12,0.45)' }} onClick={onClose}>
      <div
        className="glass h-full w-full max-w-sm overflow-y-auto scrollbar-thin p-5"
        style={{ borderLeft: '1px solid var(--glass-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Settings</h2>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--ink-mute)' }} aria-label="Close settings">✕</button>
        </div>

        <div className="card">
          <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Live Gemini API key</h3>
          {GEMINI_KEY_APPLIES ? (
            <>
              <p className="mb-2 text-xs" style={{ color: 'var(--ink-mute)' }}>
                This offline build has no server to hold a key for you. Paste an API key to enable live AI responses for this browser tab only — kept in memory, never saved to disk, and cleared on refresh.
              </p>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={hasKey ? 'Key set — paste a new one to replace it' : 'Paste your Gemini API key…'}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--edge)' }}
                autoComplete="off"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={save} disabled={!keyInput.trim()} className="rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}>
                  Save for this session
                </button>
                {hasKey && (
                  <button onClick={clear} className="rounded-md border px-3 py-1.5 text-sm font-medium" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11px]" style={{ color: hasKey ? 'var(--good)' : 'var(--ink-mute)' }}>
                {hasKey ? '✓ Live key set for this session.' : 'No key set — AI actions use rules-engine/example responses.'}
              </p>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>
              This build talks to the Express server, which takes its Gemini key from the <code>GEMINI_API_KEY</code> environment variable — there's nothing to paste here in this mode.
            </p>
          )}
          <p className="mt-3 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
            Model: <code>gemini-2.5-flash</code> · 8s timeout · max 8 calls/minute · every AI action always degrades to a labelled example response rather than a blank box or error, and Brand Voice Certification's deterministic rubric can override a live model's verdict (never the other way around).
          </p>
        </div>

        <div className="card mt-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>Live Sync (experimental)</h3>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" checked={liveSync} onChange={toggleLiveSync} className="peer sr-only" />
              <div className="pointer-events-none h-5 w-9 rounded-full transition-colors" style={{ background: liveSync ? 'var(--brand-accent)' : 'var(--edge)' }} />
              <div className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: liveSync ? 'translateX(1rem)' : 'none' }} />
            </label>
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>
            Off by default. When on, this console listens for live activity from a connected storefront — useful when demonstrating the storefront and console side by side.
          </p>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
            No storefront is connected in this environment, so nothing will appear here yet.
          </p>
          {liveSync && (
            <p className="mt-2 text-[11px] font-medium" style={{ color: eventCount > 0 ? 'var(--good)' : 'var(--brand-accent)' }}>
              {eventCount > 0 ? `✓ ${eventCount} update(s) received.` : '● Listening for storefront activity…'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
