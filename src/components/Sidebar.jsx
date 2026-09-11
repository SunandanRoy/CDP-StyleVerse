import { NavLink } from 'react-router-dom'
import NavIcon from './NavIcon'

const NAV_GROUPS = [
  {
    label: 'Customer Intelligence',
    owners: 'CRM & Loyalty · Customer Analytics',
    items: [
      { to: '/customers', label: 'Unified Profile View', icon: 'customers' },
      { to: '/confidence', label: 'Confidence Layer', icon: 'confidence' },
      { to: '/fit-passport', label: 'Fit Passport Administration', icon: 'passport' }
    ]
  },
  {
    label: 'Experience Ops',
    owners: 'Digital Customer Support · Marketplace Operations',
    items: [
      { to: '/returns', label: 'Return Interception', icon: 'interception' },
      { to: '/returns/decoder', label: 'Return Reason Decoder', icon: 'decoder' },
      { to: '/cases', label: 'Unified Case Thread', icon: 'cases' },
      { to: '/track-everywhere', label: 'Track Everywhere', icon: 'track' }
    ]
  },
  {
    label: 'Governance',
    owners: 'Journey & Experience Design · AI CoE',
    items: [
      { to: '/governance/dial', label: 'AI Involvement Dial', icon: 'dial' },
      { to: '/governance/voice-certification', label: 'Brand Voice Certification', icon: 'voice' },
      { to: '/governance/override-wins', label: 'Override Wins', icon: 'override' },
      { to: '/governance/model-registry', label: 'Model Registry', icon: 'registry' }
    ]
  },
  {
    label: 'Business Health',
    owners: 'DCX Leadership · AI CoE',
    items: [
      { to: '/business/capacity-ledger', label: 'DCX Capacity Ledger', icon: 'capacity' },
      { to: '/business/marketplace-signal', label: 'Marketplace Signal Engine', icon: 'signal' },
      { to: '/business/career-lattice', label: 'Career Lattice', icon: 'lattice' }
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
            `mx-3 mb-3 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'text-white' : ''}`
          }
          style={({ isActive }) => (isActive ? { background: 'var(--brand-accent)' } : { color: 'var(--ink)' })}
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
