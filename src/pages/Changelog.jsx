import { Link } from 'react-router-dom'
import { BUG_FIXES, FEATURES, SCOPE_NOTES } from '../lib/changelogData'

function EntryCard({ entry }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}>{entry.id}</span>
        <h3 className="font-heading text-sm font-bold">{entry.title}</h3>
      </div>
      <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-mute)' }}>{entry.body}</p>
      {entry.link && (
        <Link to={entry.link} className="mt-2 inline-block text-xs font-medium" style={{ color: 'var(--brand-accent)' }}>
          Open this module →
        </Link>
      )}
    </div>
  )
}

export default function Changelog() {
  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-2xl font-bold">Changelog — v2.0</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
        This build adopted the shared SCE_DATA_CONTRACT.md data spine, fixed 13 named bugs, and added 9 new features. Console-only build — see the scope note at the bottom.
      </p>

      <div className="mt-6">
        <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
          D1–D9 — New Features
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FEATURES.map((f) => <EntryCard key={f.id} entry={f} />)}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
          C1–C13 — Bug Fixes
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {BUG_FIXES.map((f) => <EntryCard key={f.id} entry={f} />)}
        </div>
      </div>

      <div className="mt-8 card">
        <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
          Known Scope Limits — Console-only Build
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm" style={{ color: 'var(--ink-mute)' }}>
          {SCOPE_NOTES.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </div>
  )
}
