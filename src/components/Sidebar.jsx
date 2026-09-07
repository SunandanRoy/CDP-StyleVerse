import { NavLink } from 'react-router-dom'

const NAV_GROUPS = [
  {
    label: 'Customer Intelligence',
    items: [
      { to: '/customers', label: 'Unified Profile View' },
      { to: '/confidence', label: 'Confidence Layer' },
      { to: '/fit-passport', label: 'Fit Passport Administration' }
    ]
  },
  {
    label: 'Experience Ops',
    items: [
      { to: '/returns', label: 'Return Interception' },
      { to: '/returns/decoder', label: 'Return Reason Decoder' },
      { to: '/cases', label: 'Unified Case Thread' },
      { to: '/track-everywhere', label: 'Track Everywhere' }
    ]
  },
  {
    label: 'Governance',
    items: [
      { to: '/governance/dial', label: 'AI Involvement Dial' },
      { to: '/governance/voice-certification', label: 'Brand Voice Certification' },
      { to: '/governance/override-wins', label: 'Override Wins' },
      { to: '/governance/model-registry', label: 'Model Registry' }
    ]
  },
  {
    label: 'Business Health',
    items: [
      { to: '/business/capacity-ledger', label: 'DCX Capacity Ledger' },
      { to: '/business/marketplace-signal', label: 'Marketplace Signal Engine' },
      { to: '/business/career-lattice', label: 'Career Lattice' }
    ]
  }
]

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r h-full overflow-y-auto scrollbar-thin" style={{ borderColor: 'var(--edge)', background: 'var(--surface-alt)' }}>
      <nav className="py-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `mx-3 mb-3 flex items-center rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'text-white' : ''}`
          }
          style={({ isActive }) => (isActive ? { background: 'var(--brand-accent)' } : { color: 'var(--ink)' })}
        >
          Dashboard
        </NavLink>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-mute)' }}>
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="mx-2 mb-0.5 flex items-center rounded-md px-3 py-2 text-sm"
                style={({ isActive }) =>
                  isActive
                    ? { background: 'var(--brand-accent-soft)', color: 'var(--brand-accent)', fontWeight: 600 }
                    : { color: 'var(--ink-mute)' }
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
