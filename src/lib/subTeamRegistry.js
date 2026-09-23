// D1 — "View as" sub-team switcher. Maps each of the 5 contract sub-teams to
// the nav items it actually owns (per navRegistry's `group.owners` strings)
// so a switched-in view can filter the sidebar down to just its own modules.
export const SUB_TEAMS = [
  'Digital Customer Support',
  'Marketplace Operations',
  'CRM & Loyalty',
  'Customer Analytics',
  'Customer Journey & Experience Design'
]

// Nav-group labels each sub-team should see, plus any individual extra items
// pulled in from a group it doesn't otherwise own (e.g. DCS also lives in
// Case Thread / Track Everywhere which sit under "Experience Ops").
const GROUP_OWNERSHIP = {
  'Digital Customer Support': ['Experience Ops'],
  'Marketplace Operations': ['Experience Ops'],
  'CRM & Loyalty': ['Customer Intelligence'],
  'Customer Analytics': ['Customer Intelligence', 'Business Health'],
  'Customer Journey & Experience Design': ['Governance', 'Business Health']
}

// A few items are shared across an owning group but only make sense for one
// sub-team within it — trim those per sub-team rather than at group level.
const ITEM_EXCLUSIONS = {
  'Digital Customer Support': ['/business/marketplace-signal'],
  'Marketplace Operations': ['/returns/decoder', '/track-everywhere', '/grievance-radar']
}

export function navGroupsForSubTeam(navGroups, subTeam) {
  if (!subTeam) return navGroups
  const allowedGroups = GROUP_OWNERSHIP[subTeam] || []
  const excluded = new Set(ITEM_EXCLUSIONS[subTeam] || [])
  return navGroups
    .filter((g) => allowedGroups.includes(g.label))
    .map((g) => ({ ...g, items: g.items.filter((item) => !excluded.has(item.to)) }))
    .filter((g) => g.items.length > 0)
}

export const SUB_TEAM_BLURBS = {
  'Digital Customer Support': 'Case threads, delivery exceptions, grievance triage.',
  'Marketplace Operations': 'Marketplace signal, aggregate return codes, listing hygiene.',
  'CRM & Loyalty': 'Unified profiles, Fit Passport, Advisor Workspace.',
  'Customer Analytics': 'Confidence Layer, fit-matrix adjustments, model registry, KPI reporting.',
  'Customer Journey & Experience Design': 'AI Involvement Dial, Brand Voice Certification, career lattice, journey design.'
}
