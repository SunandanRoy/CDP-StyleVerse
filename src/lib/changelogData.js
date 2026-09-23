// Stage 5 — in-app Changelog data, mirroring CHANGELOG_CONSOLE_v2.md at the
// repo root. Kept as structured data (not parsed markdown) so the page can
// render it without a markdown dependency.
export const BUG_FIXES = [
  { id: 'C1', title: 'Marketplace data boundary', body: 'Marketplace-only buyers carry zero identity (no name, archetype, or Fit Passport) — enforced at the data layer, not just the UI. CustomerList gets a D2C/Marketplace tab switcher.' },
  { id: 'C2', title: 'Brand-of-record wording', body: "A case's brand-dependent wording now reads its own brand_id, never the header's currently-selected brand. CaseThreadDetail shows a \"viewing other brand\" chip when they differ." },
  { id: 'C3', title: 'Brand Voice Certification guard', body: 'The deterministic rubric is the actual guard beneath every live Gemini call — a model "Pass" can never override a rubric "Fail" (never the reverse).' },
  { id: 'C4', title: 'Live AI in the static build', body: 'The standalone build can hold a live Gemini API key (memory-only, never localStorage) via a Settings drawer, so static builds are not limited to canned responses.' },
  { id: 'C5', title: 'Seed realism', body: 'Delivered orders are always ≥3 days before DEMO_TODAY; in-transit delivery-exception orders feed Grievance Radar and Case Thread delay scenarios.' },
  { id: 'C6', title: 'Marketplace Signal labels/counts', body: "Marketplace Signal Engine's labels/counts match what's actually in the data — no static copy that drifts from the seed." },
  { id: 'C7', title: 'Return Interception semantics', body: "The table makes eligibility and \"why not intercepted\" explicit per row instead of implying every return was considered." },
  { id: 'C8', title: 'Automation-bias flag', body: 'Flags any registry component whose override rate sits below the 15–30% healthy band (staff rubber-stamping AI output), surfaced on Model Registry.' },
  { id: 'C9', title: 'Capacity Ledger reconciliation', body: "\"Released to date\" is a monthly run-rate against a monthly target, not a 7-month cumulative sum compared against a monthly figure." },
  { id: 'C10', title: 'Career Lattice', body: 'Matches the contract\'s 5-transition list, retiring the stale 6-transition version.' },
  { id: 'C11', title: 'Unambiguous dates', body: 'Every date renders through formatDateIN (e.g. "25 Sep 2026") — no ambiguous MM/DD vs DD/MM anywhere.' },
  { id: 'C12', title: 'Sidebar collapse under 900px', body: "Sidebar auto-collapses to the icon rail below 900px viewport width, independent of the user's own persisted preference." },
  { id: 'C13', title: 'Dial audit trail', body: 'Every AI Involvement Dial change requires a reason and writes to a visible audit log.' }
]

export const FEATURES = [
  { id: 'D1', title: '"View as" sub-team switcher', body: 'A top-bar dropdown across the 5 DCX sub-teams filters the sidebar to that team\'s own modules and swaps the Dashboard link for a role-scoped Today home showing that team\'s Automate/Augment/Amplify capacity split.', link: '/today' },
  { id: 'D2', title: 'Advisor Workspace', body: 'For Advisor-Mediated brands (Maison Luxe, EcoWeave): client book → AI brief + suggested looks → sign-off → advisor edit → Brand Voice Certification → send, with a side-by-side internal/client preview. A materially-edited draft logs a new Override Wins entry. Adds a 5th Gemini call site, advisor-brief.', link: '/advisor-workspace' },
  { id: 'D3', title: 'Grievance Radar', body: "Scores open cases for grievance risk against each brand's Dial proactivity_threshold; an AI-drafted outreach and \"mark sent\" turns a case proactive. Priya Nair's delivery-exception scenario is guaranteed in the seed so she reliably appears here.", link: '/grievance-radar' },
  { id: 'D4', title: 'Closed feedback loop', body: 'A SKU hot-list by return rate × archetype × zone; "Propose adjustment" → Customer Analytics approval mutates the live fit matrix and appends to the adjustment log in the same step, so the Confidence Layer recomputes on its very next call.', link: '/feedback-loop' },
  { id: 'D5', title: 'Marketplace data boundary in Signal Engine', body: "An explicit channel-capability matrix, SKU-level aggregate marketplace reason codes, a bridge funnel (+250 loyalty points on approval), and a Plan-B text sizing-badge generator.", link: '/business/marketplace-signal' },
  { id: 'D6', title: 'Confidence calibration', body: 'A reliability chart (predicted decile vs. observed kept rate) and an exact Brier score. Shown on Confidence Layer and Model Registry\'s Confidence Score Model card.', link: '/confidence' },
  { id: 'D7', title: 'Dashboard v2', body: 'A revenue funnel decomposing the End-to-end Conversion KPI\'s arithmetic into stages; live return rate vs. commitment with case references; the Exhibit 2 70/30 time-allocation split cross-checked against the Capacity Ledger.', link: '/' },
  { id: 'D8', title: 'Customer 360 v2', body: 'Consent tags per data category, an Identity Graph (D2C profile → loyalty account → marketplace alias). "Open storefront as this customer" is explicitly N/A — no Storefront file exists in this Console-only build.', link: '/customers' },
  { id: 'D9', title: 'Optional live event bus stub', body: 'A LIVE_SYNC flag (default off) in the Settings drawer listens across browser tabs for a shared event-bus key. No Storefront producer exists in this workspace, so it is a real, working listener with nothing to listen to.', link: null }
]

export const SCOPE_NOTES = [
  'No cross-tool checksum matching, ?persona= deep links into a Storefront file, or literal Storefront-authored content — everywhere the contract says "both tools," this build treats it as N/A.',
  'The event bus (D9) and the "open storefront as this customer" link (D8) are both stubs for the same reason: there is no second tool to connect to in this workspace.'
]
