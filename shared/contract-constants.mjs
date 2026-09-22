// SCE_DATA_CONTRACT.md v2.0 — canonical constants shared by the seed
// generator, the console-extension generator, and the app at runtime.
// Console-only build (no Storefront project exists in this workspace): the
// values below follow the contract's rules exactly, but are authored
// directly for this Console rather than copied from a sibling Storefront —
// see SCE_DATA_CONTRACT.md §"Console-only" note in CHANGELOG_CONSOLE_v2.md.

export const DEMO_TODAY = '2026-09-25'

export const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Footwear', 'Dresses', 'Accessories']

export const APPAREL_SIZE_RUN = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
export const FOOTWEAR_SIZE_RUN = [4, 5, 6, 7, 8, 9, 10, 11]

// §4 — zones per category, dominant zone drives the recommended-size shift.
export const ZONES_BY_CATEGORY = {
  Tops: ['shoulders', 'chest', 'length'],
  Outerwear: ['shoulders', 'chest', 'length'],
  Bottoms: ['waist', 'hip', 'inseam'],
  Dresses: ['bust', 'waist', 'length'],
  Footwear: ['length', 'width']
  // Accessories: fit_applicable = false — no zones, no fit matrix row.
}

export const DOMINANT_ZONE = {
  Tops: 'shoulders',
  Outerwear: 'shoulders',
  Bottoms: 'waist',
  Dresses: 'bust',
  Footwear: 'length'
}

// §2 — brands. Hard-limit strings, accents and fonts kept from the v1
// console. disclosure_mode/ai_tooling_mode/return-rate targets and
// client_facing_generative / escalation_visible corrected to the contract.
export const BRANDS = [
  {
    id: 'speedstyle',
    name: 'SpeedStyle',
    posture: 'Automate-heavy',
    disclosure_mode: 'Self-Directed',
    ai_tooling_mode: 'full_llm',
    client_facing_generative: true,
    escalation_visible: false,
    return_rate_target: 28,
    return_rate_source: 'case',
    price_band: [499, 2999],
    nps: 35,
    monthly_queries: 45000,
    resolution_hrs: 72,
    top_query_type: 'Size/Fit issues',
    hard_limit: 'Synthetic imagery labelled; no implied fit accuracy beyond product capability',
    accent_color: '#E0401B',
    accent_soft: '#FDEBE5',
    heading_font: "'Oswald', 'Arial Narrow', sans-serif",
    body_font: "'Inter', system-ui, sans-serif",
    tracking: '-0.01em'
  },
  {
    id: 'urbanedge',
    name: 'UrbanEdge',
    posture: 'Balanced',
    disclosure_mode: 'Self-Directed',
    ai_tooling_mode: 'full_llm',
    client_facing_generative: true,
    escalation_visible: true,
    return_rate_target: 21,
    return_rate_source: 'Tier C',
    price_band: [1299, 4999],
    nps: 48,
    monthly_queries: 18000,
    resolution_hrs: 36,
    top_query_type: 'Delivery status',
    hard_limit: 'Disclosure at every AI touchpoint, one-tap human escalation',
    accent_color: '#2563EB',
    accent_soft: '#E8EFFD',
    heading_font: "'Inter', system-ui, sans-serif",
    body_font: "'Inter', system-ui, sans-serif",
    tracking: '0em'
  },
  {
    id: 'maisonluxe',
    name: 'Maison Luxe',
    posture: 'Amplify-dominant',
    disclosure_mode: 'Advisor-Mediated',
    ai_tooling_mode: 'internal_llm_only',
    client_facing_generative: false,
    escalation_visible: null, // n/a — human-fronted, no AI escalation path to disclose
    return_rate_target: 9,
    return_rate_source: 'case',
    price_band: [12000, 48000],
    nps: 62,
    monthly_queries: 5000,
    resolution_hrs: 12,
    top_query_type: 'Styling advice',
    hard_limit: 'Generative content prohibited client-facing; AI-informed curation OK with human sign-off',
    accent_color: '#A6802F',
    accent_soft: '#F4EFE4',
    heading_font: "'Playfair Display', 'Cormorant Garamond', serif",
    body_font: "'Cormorant Garamond', Georgia, serif",
    tracking: '0.03em'
  },
  {
    id: 'ecoweave',
    name: 'EcoWeave',
    posture: 'Augment-led',
    disclosure_mode: 'Advisor-Mediated', // §12.1 open decision — default applied
    ai_tooling_mode: 'retrieval_only',
    client_facing_generative: false,
    escalation_visible: false,
    return_rate_target: 16,
    return_rate_source: 'Tier C',
    price_band: [1999, 6999],
    nps: 55,
    monthly_queries: 8000,
    resolution_hrs: 24,
    top_query_type: 'Sustainability info',
    hard_limit: 'Every claim traces to verified supplier data; zero generative fallback',
    accent_color: '#5C8A5C',
    accent_soft: '#EAF3EA',
    heading_font: "'Inter', system-ui, sans-serif",
    body_font: "'Inter', system-ui, sans-serif",
    tracking: '0em'
  },
  {
    id: 'threadbasics',
    name: 'ThreadBasics',
    posture: 'Rules-engine automate',
    disclosure_mode: 'Self-Directed',
    ai_tooling_mode: 'rules_engine_only',
    client_facing_generative: false,
    escalation_visible: false,
    return_rate_target: 19,
    return_rate_source: 'Tier C',
    price_band: [299, 1799],
    nps: 30,
    monthly_queries: 12000,
    resolution_hrs: 48,
    top_query_type: 'Returns/Refunds',
    hard_limit: 'Cheapest viable AI, no bespoke models; still full model-card obligation',
    accent_color: '#334155',
    accent_soft: '#EDF0F4',
    heading_font: "'Space Grotesk', system-ui, sans-serif",
    body_font: "'Inter', system-ui, sans-serif",
    tracking: '0em'
  }
]
export const BRAND_IDS = BRANDS.map((b) => b.id)

// §3 — 8 archetypes (retires the old 10-archetype list).
export const ARCHETYPES = [
  { id: 'petite-slim', label: 'Petite/Slim', height_cm: [147, 157], bust_in: [30, 32], waist_in: [24, 26], hip_in: [33, 35], base_apparel_size: 'S', base_footwear_uk: 5 },
  { id: 'petite-curvy', label: 'Petite/Curvy', height_cm: [147, 160], bust_in: [34, 37], waist_in: [28, 31], hip_in: [38, 41], base_apparel_size: 'M', base_footwear_uk: 5 },
  { id: 'regular-athletic', label: 'Regular/Athletic', height_cm: [160, 170], bust_in: [34, 36], waist_in: [27, 29], hip_in: [35, 37], base_apparel_size: 'M', base_footwear_uk: 7 },
  { id: 'curvy-regular', label: 'Curvy/Regular', height_cm: [160, 170], bust_in: [37, 40], waist_in: [30, 32], hip_in: [40, 43], base_apparel_size: 'L', base_footwear_uk: 7 },
  { id: 'regular-broad', label: 'Regular/Broad', height_cm: [162, 173], bust_in: [38, 41], waist_in: [31, 34], hip_in: [37, 39], base_apparel_size: 'L', base_footwear_uk: 8 },
  { id: 'tall-slim', label: 'Tall/Slim', height_cm: [173, 188], bust_in: [33, 35], waist_in: [26, 28], hip_in: [35, 37], base_apparel_size: 'M', base_footwear_uk: 9 },
  { id: 'tall-broad', label: 'Tall/Broad-shoulder', height_cm: [173, 183], bust_in: [40, 43], waist_in: [32, 35], hip_in: [39, 41], base_apparel_size: 'L', base_footwear_uk: 9 },
  { id: 'plus-relaxed', label: 'Plus/Relaxed-fit', height_cm: [163, 175], bust_in: [44, 48], waist_in: [38, 42], hip_in: [46, 50], base_apparel_size: 'XL', base_footwear_uk: 8 }
]
export const ARCHETYPE_IDS = ARCHETYPES.map((a) => a.id)

// §10 — KPI table (both tools would render from this; Console renders it alone).
export const KPI_TABLE = [
  { kpi: 'Product-view → cart', baseline: '19%', commit: '22%', ambition: '25%', note: 'A / D', modules: [2, 3] },
  { kpi: 'End-to-end conversion', baseline: '2.5%', commit: '2.9%', ambition: '3.2%', note: '5.1M × 22% × 57% × 42% = 268,607 orders ÷ 9.2M = 2.92% ≥ 2.875% required', modules: [2, 3] },
  { kpi: 'Exploration-stage abandonment', baseline: '81%', commit: '78%', ambition: '75%', note: 'Renamed from "cart abandonment" — see §12.2', modules: [] },
  { kpi: 'First-time fit accuracy (SpeedStyle)', baseline: '58%', commit: '68%', ambition: '75%', note: 'A / D', modules: [3, 5, 13] },
  { kpi: 'SpeedStyle return rate', baseline: '28%', commit: '22.4% blended (21% D2C / 23.5% marketplace)', ambition: '20%', note: '0.45×21 + 0.55×23.5 = 22.375 ≈ 22.4 = 28 × 0.8; weights assume SpeedStyle mirrors the 45/55 portfolio split (Tier C)', modules: [4, 5, 13] },
  { kpi: 'Blended resolution time', baseline: '48 hrs', commit: '18 hrs', ambition: '8 hrs', note: 'A / D', modules: [6, 7] },
  { kpi: 'SpeedStyle resolution time', baseline: '72 hrs', commit: '24 hrs', ambition: '10 hrs', note: 'Round 1 Exhibit 2', modules: [6, 7] },
  { kpi: 'Repeat purchase (SpeedStyle)', baseline: '32%', commit: '36%', ambition: '40%', note: '', modules: [4, 6] },
  { kpi: 'Average order value', baseline: '~₹3,195', commit: '+8%', ambition: '+15%', note: 'Tier C', modules: [] },
  { kpi: 'NPS (SpeedStyle)', baseline: '35', commit: '45', ambition: '52', note: '', modules: [6, 7] },
  { kpi: 'Fit Passport opt-in (D2C)', baseline: '—', commit: '>25% in 6 months', ambition: '—', note: '', modules: [3] },
  { kpi: 'Case Thread / Track Everywhere weekly active use', baseline: '—', commit: '>80% eligible staff', ambition: '—', note: '', modules: [6, 7] },
  { kpi: 'Override rate', baseline: '—', commit: '15–30% band', ambition: '—', note: '', modules: [10] },
  { kpi: 'Brand Voice first-pass rate', baseline: '—', commit: '>85% by Month 9', ambition: '—', note: '', modules: [9] }
]

// §11 — workforce constants
export const WORKFORCE = {
  dcx_headcount: 540,
  fte_hours_per_month: 160,
  fte_equivalents_target: 119,
  get hours_per_month_target() {
    return this.fte_equivalents_target * this.fte_hours_per_month // ≈19,040
  },
  exhibit2_time_allocation: [
    { activity: 'Query resolution & grievance', pct: 30 },
    { activity: 'Segmentation & personalisation', pct: 15 },
    { activity: 'Marketplace ops & monitoring', pct: 12 },
    { activity: 'Journey analytics & reporting', pct: 14 },
    { activity: 'Campaign coordination & comms', pct: 11 },
    { activity: 'CRM & experience design', pct: 18 }
  ],
  routine_vs_high_value: { routine: 70, high_value: 30 },
  redeployment_destinations: [
    'Customer journey management',
    'Service recovery',
    'Marketplace intelligence',
    'AI-output review',
    'Personalisation strategy',
    'Customer relationship development'
  ]
}

export const SUB_TEAMS = [
  'Digital Customer Support',
  'Marketplace Operations',
  'CRM & Loyalty',
  'Customer Analytics',
  'Customer Journey & Experience Design'
]

// §11 — career lattice per solution doc §10.2 (5 transitions, retires the
// Console's old 6-transition list — C10).
export const CAREER_LATTICE = [
  { from_role: 'Customer Service Agent', to_role: 'AI Trainer / Conversation Designer', gate: 'Augment', description: 'Curates and reviews AI-drafted replies, tunes prompts and escalation rules for the case-thread assistant.' },
  { from_role: 'Marketplace Ops Analyst', to_role: 'Marketplace Intelligence Analyst', gate: 'Amplify', description: 'Moves from manual listing monitoring to mining aggregate signal for merchandising and sizing decisions.' },
  { from_role: 'CRM Executive', to_role: 'Personalisation Orchestrator', gate: 'Augment', description: 'Owns the segmentation and personalisation rules the AI executes at scale, rather than running campaigns by hand.' },
  { from_role: 'Journey Analyst', to_role: 'Customer Journey Architect', gate: 'Amplify', description: 'Designs end-to-end journeys and AI touchpoint placement instead of producing one-off reporting.' },
  { from_role: 'Senior CRM/Loyalty Specialist', to_role: 'Remote Stylist (Advisor-Mediated brands)', gate: 'Augment', description: 'Moves into the Advisor Workspace for Maison Luxe / EcoWeave, styling AI-assisted client books directly.' }
]

// §11 — capacity task → sub-team → Exhibit 2 activity lookup, used by the
// console-extension generator so tasks never land in the wrong team (C5/C9).
export const TASK_LIBRARY = [
  { task: 'Return label generation', gate: 'Automate', sub_team: 'Digital Customer Support', activity: 'Query resolution & grievance', hrs_per_task: 0.3 },
  { task: 'Tier-1 chat triage', gate: 'Automate', sub_team: 'Digital Customer Support', activity: 'Query resolution & grievance', hrs_per_task: 0.25 },
  { task: 'Delivery status lookups', gate: 'Automate', sub_team: 'Digital Customer Support', activity: 'Query resolution & grievance', hrs_per_task: 0.2 },
  { task: 'Refund status updates', gate: 'Automate', sub_team: 'Digital Customer Support', activity: 'Query resolution & grievance', hrs_per_task: 0.25 },
  { task: 'Case brief drafting', gate: 'Augment', sub_team: 'Digital Customer Support', activity: 'Query resolution & grievance', hrs_per_task: 0.4 },
  { task: 'Listing monitoring', gate: 'Automate', sub_team: 'Marketplace Operations', activity: 'Marketplace ops & monitoring', hrs_per_task: 0.3 },
  { task: 'Marketplace review triage', gate: 'Augment', sub_team: 'Marketplace Operations', activity: 'Marketplace ops & monitoring', hrs_per_task: 0.35 },
  { task: 'Size-guide badge generation', gate: 'Automate', sub_team: 'Marketplace Operations', activity: 'Marketplace ops & monitoring', hrs_per_task: 0.2 },
  { task: 'Marketplace return-code aggregation', gate: 'Automate', sub_team: 'Marketplace Operations', activity: 'Marketplace ops & monitoring', hrs_per_task: 0.25 },
  { task: 'Loyalty tier maintenance', gate: 'Automate', sub_team: 'CRM & Loyalty', activity: 'Segmentation & personalisation', hrs_per_task: 0.2 },
  { task: 'Fit Passport onboarding nudges', gate: 'Augment', sub_team: 'CRM & Loyalty', activity: 'Segmentation & personalisation', hrs_per_task: 0.3 },
  { task: 'Personal styling consultations', gate: 'Amplify', sub_team: 'CRM & Loyalty', activity: 'CRM & experience design', hrs_per_task: 0.6 },
  { task: 'Marketplace claim-batch processing', gate: 'Automate', sub_team: 'CRM & Loyalty', activity: 'Segmentation & personalisation', hrs_per_task: 0.25 },
  { task: 'Confidence-score calibration review', gate: 'Augment', sub_team: 'Customer Analytics', activity: 'Journey analytics & reporting', hrs_per_task: 0.5 },
  { task: 'Fit-matrix adjustment approval', gate: 'Augment', sub_team: 'Customer Analytics', activity: 'Journey analytics & reporting', hrs_per_task: 0.4 },
  { task: 'Weekly KPI reporting', gate: 'Automate', sub_team: 'Customer Analytics', activity: 'Journey analytics & reporting', hrs_per_task: 0.3 },
  { task: 'Model registry upkeep', gate: 'Augment', sub_team: 'Customer Analytics', activity: 'Journey analytics & reporting', hrs_per_task: 0.35 },
  { task: 'AI Involvement Dial tuning', gate: 'Amplify', sub_team: 'Customer Journey & Experience Design', activity: 'CRM & experience design', hrs_per_task: 0.5 },
  { task: 'Brand voice rubric maintenance', gate: 'Augment', sub_team: 'Customer Journey & Experience Design', activity: 'CRM & experience design', hrs_per_task: 0.4 },
  { task: 'Fit-preview A/B test analysis', gate: 'Amplify', sub_team: 'Customer Journey & Experience Design', activity: 'CRM & experience design', hrs_per_task: 0.45 },
  { task: 'Campaign brief coordination', gate: 'Automate', sub_team: 'Customer Journey & Experience Design', activity: 'Campaign coordination & comms', hrs_per_task: 0.3 },
  { task: 'Journey touchpoint mapping', gate: 'Amplify', sub_team: 'Customer Journey & Experience Design', activity: 'Journey analytics & reporting', hrs_per_task: 0.4 },
  { task: 'Grievance Radar outreach drafting', gate: 'Augment', sub_team: 'Digital Customer Support', activity: 'Query resolution & grievance', hrs_per_task: 0.35 },
  { task: 'Advisor brief generation (Maison Luxe / EcoWeave)', gate: 'Augment', sub_team: 'CRM & Loyalty', activity: 'CRM & experience design', hrs_per_task: 0.5 }
]

export const RETURN_REASON_CODES = ['size_fit', 'defective', 'not_as_described', 'no_longer_needed', 'other']
export const NON_INTERCEPTION_REASONS = ['out_of_stock', 'below_confidence_threshold', 'above_value_threshold_routed_to_human']
export const CORRECTED_SIZE_CONFIDENCE_THRESHOLD = 55

export const CASE_TEMPLATE_TYPES = ['size_exchange', 'delivery_delay', 'refund_status', 'sourcing_question', 'alteration_request']
