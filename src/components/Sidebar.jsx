import { NavLink } from 'react-router-dom'
import NavIcon from './NavIcon'
import { NAV_GROUPS } from '../lib/navRegistry'

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r h-full overflow-y-auto scrollbar-thin" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
      <nav className="py-4">
        <NavLink
          to="/"
          end
          className="mx-3 mb-3 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold"
          style={({ isActive }) => (isActive ? { background: 'var(--brand-accent)', color: 'var(--brand-accent-text)' } : { color: 'var(--ink)' })}
        >
          <NavIcon name="dashboard" />
          Dashboard
        </NavLink>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div
              className="cursor-default px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--ink-mute)' }}
              title={`Primary owners: ${group.owners}`}
            >
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="mx-2 mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm"
                style={({ isActive }) =>
                  isActive
                    ? { background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)', fontWeight: 600 }
                    : { color: 'var(--ink-mute)' }
                }
              >
                <NavIcon name={item.icon} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
