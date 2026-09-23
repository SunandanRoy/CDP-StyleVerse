import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import NavIcon from './NavIcon'
import { NAV_GROUPS } from '../lib/navRegistry'
import { navGroupsForSubTeam } from '../lib/subTeamRegistry'
import { useBrand } from '../context/BrandContext'

// C12 — below 900px the sidebar auto-collapses to the icon rail so content
// isn't crushed; this doesn't touch the user's own persisted preference, it
// just overrides it while the viewport is narrow.
function useNarrowViewport() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const handler = (e) => setNarrow(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return narrow
}

function ChevronIcon({ collapsed }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

export default function Sidebar() {
  const { sidebarCollapsed: userCollapsed, toggleSidebar, subTeam } = useBrand()
  const narrow = useNarrowViewport()
  const sidebarCollapsed = userCollapsed || narrow
  const navGroups = navGroupsForSubTeam(NAV_GROUPS, subTeam)

  return (
    <aside
      className="relative shrink-0 overflow-y-auto overflow-x-hidden border-r scrollbar-thin transition-[width] duration-200 ease-in-out"
      style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)', width: sidebarCollapsed ? '4.25rem' : '16rem', height: '100%' }}
    >
      <nav className="py-4">
        <div className={`mb-2 flex items-center px-3 ${sidebarCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
            style={{ borderColor: 'var(--edge)', color: 'var(--ink-mute)' }}
          >
            <ChevronIcon collapsed={sidebarCollapsed} />
          </button>
        </div>

        <NavLink
          to={subTeam ? '/today' : '/'}
          end
          title={sidebarCollapsed ? (subTeam ? 'Today' : 'Dashboard') : undefined}
          className={`mx-3 mb-3 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold ${sidebarCollapsed ? 'justify-center' : ''}`}
          style={({ isActive }) => (isActive ? { background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' } : { color: 'var(--ink)' })}
        >
          <NavIcon name="dashboard" className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span className="truncate">{subTeam ? 'Today' : 'Dashboard'}</span>}
        </NavLink>

        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {sidebarCollapsed ? (
              <div className="mx-3 mb-1 mt-2 border-t" style={{ borderColor: 'var(--edge)' }} title={`${group.label} — ${group.owners}`} />
            ) : (
              <div
                className="cursor-default px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--ink-mute)' }}
                title={`Primary owners: ${group.owners}`}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={sidebarCollapsed ? item.label : undefined}
                className={`mx-2 mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${sidebarCollapsed ? 'justify-center' : ''}`}
                style={({ isActive }) =>
                  isActive
                    ? { background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)', fontWeight: 600 }
                    : { color: 'var(--ink-mute)' }
                }
              >
                <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
