// Single source of truth for every navigable module — used by the Sidebar
// and the Command Palette so the two can never fall out of sync.
export const NAV_GROUPS = [
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

export const DASHBOARD_ITEM = { to: '/', label: 'Dashboard', icon: 'dashboard' }

export const ALL_NAV_ITEMS = [
  { ...DASHBOARD_ITEM, group: 'Overview' },
  ...NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })))
]
