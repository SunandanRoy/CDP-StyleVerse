import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { ALL_NAV_ITEMS } from '../lib/navRegistry'
import { SUB_TEAMS } from '../lib/subTeamRegistry'
import SettingsDrawer from './SettingsDrawer'

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a.5.5 0 0 0-.6-.7A9.5 9.5 0 1 0 21.2 15.2a.5.5 0 0 0-.7-.6Z" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  )
}

function useCurrentNavItem() {
  const location = useLocation()
  return useMemo(() => {
    const path = location.pathname
    let best = null
    for (const item of ALL_NAV_ITEMS) {
      const matches = path === item.to || (item.to !== '/' && path.startsWith(`${item.to}/`))
      if (matches && (!best || item.to.length > best.to.length)) best = item
    }
    return best
  }, [location.pathname])
}

export default function TopBar() {
  const { brands, brandId, setBrandId, brand, effectiveTheme, toggleTheme, subTeam, setSubTeam } = useBrand()
  const currentItem = useCurrentNavItem()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const navigate = useNavigate()

  const handleViewAsChange = (value) => {
    setSubTeam(value || null)
    navigate(value ? '/today' : '/')
  }

  return (
    <>
    <header
      className="glass sticky top-0 z-30 flex shrink-0 items-center justify-between px-6"
      style={{ height: 'var(--topbar-h)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded font-heading text-sm font-bold"
          style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}
        >
          SV
        </div>
        <div className="font-heading text-lg font-semibold" style={{ letterSpacing: 'var(--tracking-heading)' }}>
          StyleVerse Confidence Engine
        </div>
        <span
          className="ml-1 hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-block"
          style={{ background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)' }}
        >
          Enterprise Console
        </span>

        {currentItem && (
          <div className="ml-2 hidden items-center gap-1.5 border-l pl-3 text-xs lg:flex" style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}>
            <span>{currentItem.group}</span>
            <span aria-hidden="true">›</span>
            <span className="font-medium" style={{ color: 'var(--ink)' }}>{currentItem.label}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('styleverse:open-command-palette'))}
          className="hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs md:flex"
          style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)', background: 'color-mix(in srgb, var(--surface) 55%, transparent)' }}
          title="Search &amp; jump to any module"
        >
          <SearchIcon />
          Jump to…
          <kbd className="ml-1 rounded border px-1 font-sans text-[10px]" style={{ borderColor: 'var(--edge)' }}>⌘K</kbd>
        </button>

        <span className="hidden text-xs font-medium lg:inline" style={{ color: 'var(--ink-mute)' }}>
          Last 6 months
        </span>

        <select
          value={subTeam || ''}
          onChange={(e) => handleViewAsChange(e.target.value)}
          className="rounded-md border px-2.5 py-1.5 text-xs font-medium"
          style={{ borderColor: 'var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }}
          title="View as — filters the sidebar and shows a role-scoped Today home"
        >
          <option value="">View as: Leadership (all)</option>
          {SUB_TEAMS.map((t) => (
            <option key={t} value={t}>View as: {t}</option>
          ))}
        </select>

        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--edge)', background: 'var(--surface)', color: 'var(--ink)' }}
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {brand && (
          <span
            className="hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-block"
            style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' }}
          >
            {brand.posture}
          </span>
        )}

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          title="Settings — live Gemini key"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}
        >
          <GearIcon />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}
        >
          {effectiveTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
    {/* Rendered as a sibling, not a header child: the header's .glass class
        uses backdrop-filter, which creates a new containing block for
        position:fixed descendants — nesting the drawer inside it would trap
        the "fixed inset-0" overlay inside the topbar's own box instead of
        covering the viewport. */}
    <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
