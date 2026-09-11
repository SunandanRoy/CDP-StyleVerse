import { BRANDS, BRAND_IDS } from './brands.js'
import { makeRng } from './prng.js'
import { imageForIndex, CATEGORY_LIST } from './imageLibrary.js'
import { ZONES_BY_CATEGORY } from '../../shared/zones.js'
import {
  FIRST_NAMES, LAST_NAMES, EMPLOYEE_NAMES, SUB_TEAMS, PRODUCT_NAME_PARTS,
  REVIEW_TEXT_TEMPLATES_FIT, REVIEW_TEXT_TEMPLATES_GENERAL, CASE_OPENER_TEMPLATES,
  CASE_AGENT_REPLIES, CASE_STATUSES, ORDER_STATUSES, CAPACITY_TASK_NAMES,
  REDEPLOYMENT_TARGETS, CAREER_LATTICE, OVERRIDE_SUGGESTIONS, OVERRIDE_REASONS, OVERRIDE_OUTCOMES,
  ARCHETYPE_MEASUREMENT_PROFILES
} from './pools.js'

const SEED = 20260307
const rng = makeRng(SEED)

// ---- Simulated 6-month window: 2026-03-08 through 2026-09-07 ----
const WINDOW_START = new Date('2026-03-08T00:00:00Z')
const WINDOW_END = new Date('2026-09-07T00:00:00Z')
const WINDOW_MONTHS = 6

function monthStart(monthIdx) {
  const d = new Date(WINDOW_START)
  d.setUTCMonth(d.getUTCMonth() + monthIdx)
  return d
}

// Recency-weighted date generator: later months get progressively more
// activity (retail growth curve), not a flat uniform spread.
function simulatedDate() {
  const weights = Array.from({ length: WINDOW_MONTHS }, (_, i) => [i, 1 + i * 0.6])
  const monthIdx = rng.pickWeighted(weights)
  const start = monthStart(monthIdx).getTime()
  const end = Math.min(monthStart(monthIdx + 1).getTime(), WINDOW_END.getTime())
  const t = start + rng.float() * (end - start)
  return new Date(t).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------- archetypes
export const archetypes = [
  { id: 'arch_petite_slim', label: 'Petite Slim', measurement_range: 'Bust 30–32in · Waist 24–26in · Hip 33–35in · Height <5\'2"', silhouette_svg_ref: 'petite_slim' },
  { id: 'arch_petite_curvy', label: 'Petite Curvy', measurement_range: 'Bust 34–36in · Waist 28–30in · Hip 38–40in · Height <5\'2"', silhouette_svg_ref: 'petite_curvy' },
  { id: 'arch_regular_slim', label: 'Regular Slim', measurement_range: 'Bust 32–34in · Waist 26–28in · Hip 35–37in · Height 5\'2"–5\'6"', silhouette_svg_ref: 'regular_slim' },
  { id: 'arch_regular_athletic', label: 'Regular Athletic', measurement_range: 'Chest 34–36in · Waist 28–30in · Hip 36–38in · Height 5\'2"–5\'6"', silhouette_svg_ref: 'regular_athletic' },
  { id: 'arch_regular_curvy', label: 'Regular Curvy', measurement_range: 'Bust 38–40in · Waist 32–34in · Hip 42–44in · Height 5\'2"–5\'6"', silhouette_svg_ref: 'regular_curvy' },
  { id: 'arch_tall_slim', label: 'Tall Slim', measurement_range: 'Bust 33–35in · Waist 27–29in · Hip 36–38in · Height >5\'6"', silhouette_svg_ref: 'tall_slim' },
  { id: 'arch_tall_athletic', label: 'Tall Athletic', measurement_range: 'Chest 36–38in · Waist 30–32in · Hip 38–40in · Height >5\'6"', silhouette_svg_ref: 'tall_athletic' },
  { id: 'arch_plus_curvy', label: 'Plus Curvy', measurement_range: 'Bust 44–46in · Waist 38–40in · Hip 48–50in · Height 5\'2"–5\'6"', silhouette_svg_ref: 'plus_curvy' },
  { id: 'arch_plus_straight', label: 'Plus Straight', measurement_range: 'Bust 42–44in · Waist 40–42in · Hip 44–46in · Height 5\'2"–5\'6"', silhouette_svg_ref: 'plus_straight' },
  { id: 'arch_broad_athletic', label: 'Broad Shoulder Athletic', measurement_range: 'Chest 40–42in · Waist 32–34in · Hip 38–40in · Height >5\'8"', silhouette_svg_ref: 'broad_athletic' }
]

// ------------------------------------------------------------------ brands
export const brands = BRANDS

// ------------------------------------------------------------------ fit_matrix
function fitDirectionWeights(category, archetypeId, zone) {
  // Realistic-ish bias: plus archetypes skew tight in fitted categories,
  // petite skews loose (standard sizing runs big on them), tall skews loose
  // on length zones, athletic skews tight on chest/shoulder zones.
  let w = { true_to_size: 5, runs_tight: 2, runs_loose: 2 }
  const isLengthZone = ['Sleeve Length', 'Inseam', 'Strap Length'].includes(zone)
  const isWidthZone = ['Shoulder', 'Bust/Chest', 'Chest', 'Waist', 'Hip', 'Bust', 'Width'].includes(zone)
  if (archetypeId.includes('plus') && isWidthZone) w = { true_to_size: 3, runs_tight: 6, runs_loose: 1 }
  if (archetypeId.includes('petite') && !isLengthZone) w = { true_to_size: 3, runs_tight: 1, runs_loose: 5 }
  if (archetypeId.includes('petite') && isLengthZone) w = { true_to_size: 2, runs_tight: 1, runs_loose: 6 }
  if (archetypeId.includes('tall') && isLengthZone) w = { true_to_size: 2, runs_tight: 5, runs_loose: 1 }
  if ((archetypeId.includes('athletic') || archetypeId.includes('broad')) && isWidthZone && category !== 'Bottoms') {
    w = { true_to_size: 3, runs_tight: 5, runs_loose: 1 }
  }
  return Object.entries(w).map(([k, v]) => [k, v])
}

export const fit_matrix = []
for (const category of CATEGORY_LIST) {
  for (const archetype of archetypes) {
    for (const zone of ZONES_BY_CATEGORY[category]) {
      fit_matrix.push({
        category,
        archetype_id: archetype.id,
        zone,
        fit_direction: rng.pickWeighted(fitDirectionWeights(category, archetype.id, zone))
      })
    }
  }
}

function fitMatrixLookup(category, archetypeId) {
  return fit_matrix.filter((r) => r.category === category && r.archetype_id === archetypeId)
}

// ---------------------------------------------------- confidence_adjustment_log
const DIRECTIONS = ['true_to_size', 'runs_tight', 'runs_loose']
function otherDirection(current) {
  const options = DIRECTIONS.filter((d) => d !== current)
  return rng.pick(options)
}

const ADJUSTMENT_REASONS = [
  'Return-reason clustering showed a spike in "fit runs small" for this archetype/zone over the trailing 30 days.',
  'Sizing review with Merchandising confirmed the supplier spec sheet undersold true chest measurement.',
  'Marketplace Signal Engine flagged repeated review mentions for this category/archetype combination.',
  'Manual QA re-measurement of sample garments corrected an earlier data-entry error in the size chart.',
  'Confidence Model Steward re-validated the zone against updated archetype measurement ranges.'
]

const adjustmentSeedPicks = [
  ['Tops', 'arch_plus_curvy', 'Bust/Chest'],
  ['Bottoms', 'arch_petite_slim', 'Inseam'],
  ['Dresses', 'arch_tall_athletic', 'Bust'],
  ['Footwear', 'arch_broad_athletic', 'Width'],
  ['Outerwear', 'arch_petite_curvy', 'Shoulder']
]

export const confidence_adjustment_log = adjustmentSeedPicks.map(([category, archetype_id, zone], i) => {
  const liveRow = fit_matrix.find((r) => r.category === category && r.archetype_id === archetype_id && r.zone === zone)
  const new_value = liveRow.fit_direction // guarantees a match to the live fit_matrix state
  const old_value = otherDirection(new_value)
  return {
    id: `adj_${i + 1}`,
    category,
    archetype_id,
    zone,
    old_value,
    new_value,
    reason: ADJUSTMENT_REASONS[i % ADJUSTMENT_REASONS.length],
    date: simulatedDate()
  }
})

// ------------------------------------------------------------------ customers
export const customers = []
{
  let custSeq = 1
  const GROUPS = ['d2c_only', 'marketplace_only', 'bridged']
  for (const brand of BRANDS) {
    for (const group of GROUPS) {
      for (let i = 0; i < 3; i++) {
        const first = rng.pick(FIRST_NAMES)
        const last = rng.pick(LAST_NAMES)
        const archetype = rng.pick(archetypes)
        const channels = group === 'd2c_only' ? ['D2C'] : group === 'marketplace_only' ? ['Marketplace'] : ['D2C', 'Marketplace']
        const loyalty_id = group === 'bridged' ? `FP-${100000 + rng.int(0, 899999)}` : null
        const profile = ARCHETYPE_MEASUREMENT_PROFILES[archetype.id]
        const height_cm = rng.int(profile.heightCm[0], profile.heightCm[1])
        const bust = rng.int(profile.bust[0], profile.bust[1])
        const waist = rng.int(profile.waist[0], profile.waist[1])
        const hip = rng.int(profile.hip[0], profile.hip[1])
        customers.push({
          id: `cust_${String(custSeq).padStart(3, '0')}`,
          name: `${first} ${last}`,
          channels,
          loyalty_id,
          archetype_id: archetype.id,
          brand_id: brand.id,
          signup_date: simulatedDate(),
          fit_passport: {
            archetype: archetype.label,
            height_cm,
            measurements: `Bust ${bust}in · Waist ${waist}in · Hip ${hip}in`,
            confidence: rng.int(68, 97),
            shopping_for: rng.pickWeighted([['myself', 8], ['someone else', 2]])
          },
          _group: group
        })
        custSeq++
      }
    }
  }
}

// ------------------------------------------------------------------- products
export const products = []
{
  let prodSeq = 1
  const categoryUsageCount = Object.fromEntries(CATEGORY_LIST.map((c) => [c, 0]))
  const priceRangeByBrand = {
    speedstyle: [499, 2499],
    urbanedge: [899, 3999],
    maisonluxe: [6999, 45999],
    ecoweave: [1099, 4499],
    threadbasics: [349, 1499]
  }
  const sizesByCategory = {
    Tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Bottoms: ['28', '30', '32', '34', '36', '38'],
    Outerwear: ['S', 'M', 'L', 'XL', 'XXL'],
    Footwear: ['5', '6', '7', '8', '9', '10'],
    Dresses: ['XS', 'S', 'M', 'L', 'XL'],
    Accessories: ['Free Size']
  }
  for (const brand of BRANDS) {
    // 12 products per brand, 2 per category, full 6-category coverage every brand
    for (const category of CATEGORY_LIST) {
      const namePool = rng.shuffle(PRODUCT_NAME_PARTS[category][brand.id])
      for (let n = 0; n < 2; n++) {
        const name = `${brand.name} ${namePool[n % namePool.length]}`
        const [lo, hi] = priceRangeByBrand[brand.id]
        const price_inr = Math.round((lo + rng.float() * (hi - lo)) / 10) * 10
        const baseFitBias = brand.return_rate >= 20 ? -8 : brand.return_rate <= 10 ? 6 : 0
        const base_fit_match_pct = Math.max(55, Math.min(96, 78 + baseFitBias + rng.int(-10, 10)))
        const img = imageForIndex(category, categoryUsageCount[category])
        categoryUsageCount[category]++
        const sizes = sizesByCategory[category]
        const out_of_stock_sizes = sizes.length > 1 && rng.bool(0.22) ? [rng.pick(sizes)] : []
        products.push({
          id: `prod_${String(prodSeq).padStart(3, '0')}`,
          name,
          brand_id: brand.id,
          category,
          price_inr,
          sizes,
          out_of_stock_sizes,
          base_fit_match_pct,
          image_url: img.image_url,
          image_url_detail: img.image_url_detail
        })
        prodSeq++
      }
    }
  }
}

// --------------------------------------------------------------------- orders
export const orders = []
{
  let orderSeq = 1
  const TOTAL_ORDERS = 160
  const FORCED_RETURNED = 42
  const returnedSlots = new Set()
  while (returnedSlots.size < FORCED_RETURNED) returnedSlots.add(rng.int(0, TOTAL_ORDERS - 1))

  const productsByBrand = Object.fromEntries(BRAND_IDS.map((id) => [id, products.filter((p) => p.brand_id === id)]))
  const nonReturnedStatusWeights = [
    ['Delivered', 62],
    ['In Transit', 14],
    ['Processing', 10],
    ['Cancelled', 14]
  ]

  for (let slot = 0; slot < TOTAL_ORDERS; slot++) {
    const customer = rng.pick(customers)
    const brandProducts = productsByBrand[customer.brand_id]
    const product = rng.pick(brandProducts)
    const size = rng.pick(product.sizes)
    const channel = rng.pick(customer.channels)
    const status = returnedSlots.has(slot) ? 'Returned' : rng.pickWeighted(nonReturnedStatusWeights)
    orders.push({
      id: `ord_${String(orderSeq).padStart(4, '0')}`,
      customer_id: customer.id,
      product_id: product.id,
      size,
      status,
      channel,
      date: simulatedDate()
    })
    orderSeq++
  }
}

// -------------------------------------------------------------------- returns
export const returns = []
{
  const returnedOrders = orders.filter((o) => o.status === 'Returned')
  const REASON_FIT_SMALL = 'fit_runs_small'
  const REASON_FIT_LARGE = 'fit_runs_large'
  const OTHER_REASONS = ['change_of_mind', 'quality', 'other']
  let retSeq = 1
  const total = returnedOrders.length // 42
  const fitDrivenCount = Math.round(total * 0.45) // ~19
  const fitDrivenIndices = new Set(rng.shuffle(returnedOrders.map((_, i) => i)).slice(0, fitDrivenCount))
  const fitDrivenList = [...fitDrivenIndices]
  const interceptedFitCount = Math.round(fitDrivenCount * 0.6) // ~11-12
  const interceptedFitSet = new Set(rng.shuffle(fitDrivenList).slice(0, interceptedFitCount))

  returnedOrders.forEach((order, i) => {
    const isFitDriven = fitDrivenIndices.has(i)
    const reason_code = isFitDriven ? rng.pick([REASON_FIT_SMALL, REASON_FIT_LARGE]) : rng.pick(OTHER_REASONS)
    const intercepted = isFitDriven ? interceptedFitSet.has(i) : rng.bool(0.25)
    const exchange_offered = intercepted ? rng.bool(0.85) : rng.bool(0.2)
    const exchange_accepted = exchange_offered ? rng.bool(0.7) : false
    returns.push({
      id: `ret_${String(retSeq).padStart(3, '0')}`,
      order_id: order.id,
      reason_code,
      intercepted,
      exchange_offered,
      exchange_accepted
    })
    retSeq++
  })
}

// -------------------------------------------------------------------- reviews
export const reviews = []
{
  let revSeq = 1
  const TOTAL = 70
  const fitCount = 28
  const fitIndices = new Set(rng.shuffle(Array.from({ length: TOTAL }, (_, i) => i)).slice(0, fitCount))
  for (let i = 0; i < TOTAL; i++) {
    const product = rng.pick(products)
    const mentions_fit = fitIndices.has(i)
    const text = mentions_fit ? rng.pick(REVIEW_TEXT_TEMPLATES_FIT) : rng.pick(REVIEW_TEXT_TEMPLATES_GENERAL)
    const rating = mentions_fit ? rng.pickWeighted([[2, 2], [3, 3], [4, 3], [5, 2]]) : rng.pickWeighted([[3, 1], [4, 4], [5, 5]])
    reviews.push({
      id: `rev_${String(revSeq).padStart(3, '0')}`,
      product_id: product.id,
      channel: rng.pick(['D2C', 'Marketplace']),
      text,
      rating,
      mentions_fit
    })
    revSeq++
  }
}

// ---------------------------------------------------------------------- cases
export const cases = []
{
  let caseSeq = 1
  const TOTAL = 28
  const grievanceCount = 6
  const grievanceIndices = new Set(rng.shuffle(Array.from({ length: TOTAL }, (_, i) => i)).slice(0, grievanceCount))
  for (let i = 0; i < TOTAL; i++) {
    const customer = rng.pick(customers)
    const numMessages = rng.int(2, 4) * 2 // customer/agent pairs
    const channel_log = []
    let t = new Date(`${simulatedDate()}T${String(rng.int(9, 20)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00Z`)
    for (let m = 0; m < numMessages; m++) {
      const isCustomer = m % 2 === 0
      channel_log.push({
        channel: rng.pick(customer.channels),
        message: isCustomer ? rng.pick(CASE_OPENER_TEMPLATES) : rng.pick(CASE_AGENT_REPLIES),
        timestamp: t.toISOString()
      })
      t = new Date(t.getTime() + rng.int(20, 240) * 60000)
    }
    const predicted_grievance = grievanceIndices.has(i)
    const proactive_outreach_sent = predicted_grievance ? rng.bool(0.5) : false
    cases.push({
      id: `case_${String(caseSeq).padStart(3, '0')}`,
      customer_id: customer.id,
      channel_log,
      status: rng.pick(CASE_STATUSES),
      predicted_grievance,
      proactive_outreach_sent
    })
    caseSeq++
  }
}

// ------------------------------------------------------------ capacity_ledger
export const capacity_ledger_tasks = []
{
  let taskSeq = 1
  const GATES = ['Automate', 'Augment', 'Amplify', 'Eliminate']
  const hoursRangeByGate = { Automate: [80, 420], Augment: [40, 180], Amplify: [15, 90], Eliminate: [60, 260] }
  for (const sub_team of SUB_TEAMS) {
    for (const gate of GATES) {
      const [lo, hi] = hoursRangeByGate[gate]
      const redeployed_to = gate === 'Amplify' ? 'Reinvested in-role — deeper VIP engagement' : rng.pick(REDEPLOYMENT_TARGETS)
      capacity_ledger_tasks.push({
        id: `cap_${String(taskSeq).padStart(3, '0')}`,
        sub_team,
        task_name: rng.pick(CAPACITY_TASK_NAMES[gate]),
        gate,
        hours_freed_monthly: rng.int(lo, hi),
        redeployed_to,
        date: simulatedDate()
      })
      taskSeq++
    }
  }
}

// -------------------------------------------------------------- model_registry
export const model_registry = [
  {
    id: 'model_confidence_layer',
    component_name: 'Confidence Layer',
    model_type: 'Weighted scoring ensemble',
    tier: 'Tier 2 — Decision Support',
    explainability_method: 'Formula-based feature attribution (fit-match / social-proof / hesitation)',
    last_validated: '2026-08-14',
    override_rate: 6
  },
  {
    id: 'model_fit_archetype',
    component_name: 'Fit/Archetype Model',
    model_type: 'Nearest-archetype classification',
    tier: 'Tier 2 — Decision Support',
    explainability_method: 'Nearest-archetype similarity + zone-level fit matrix',
    last_validated: '2026-08-02',
    override_rate: 9
  },
  {
    id: 'model_return_reason',
    component_name: 'Return Reason Classifier',
    model_type: 'Multi-class text classifier',
    tier: 'Tier 2 — Decision Support',
    explainability_method: 'Keyword / phrase attribution highlighting',
    last_validated: '2026-07-21',
    override_rate: 12
  },
  {
    id: 'model_case_brief_rag',
    component_name: 'Case Brief RAG/LLM',
    model_type: 'Retrieval-Augmented Generation (LLM)',
    tier: 'Tier 3 — Generative',
    explainability_method: 'Source citation over retrieved case/order passages',
    last_validated: '2026-08-29',
    override_rate: 18
  },
  {
    id: 'model_predictive_grievance',
    component_name: 'Predictive Grievance (anomaly detection)',
    model_type: 'Unsupervised anomaly detection',
    tier: 'Tier 2 — Decision Support',
    explainability_method: 'Deviation scoring vs. channel-log baseline',
    last_validated: '2026-07-05',
    override_rate: 15
  },
  {
    id: 'model_marketplace_signal',
    component_name: 'Marketplace Signal Engine',
    model_type: 'Text clustering + LLM summarization',
    tier: 'Tier 2 — Decision Support',
    explainability_method: 'Cluster exemplar reviews shown alongside insight',
    last_validated: '2026-08-19',
    override_rate: 8
  },
  {
    id: 'model_ai_dial',
    component_name: 'AI Involvement Dial (config service)',
    model_type: 'Rules/config service — no ML',
    tier: 'Tier 1 — Configuration',
    explainability_method: 'N/A — deterministic configuration, fully inspectable',
    last_validated: '2026-09-01',
    override_rate: 0
  },
  {
    id: 'model_brand_voice',
    component_name: 'Brand Voice Certification',
    model_type: 'LLM rubric classifier (pass/fail)',
    tier: 'Tier 2 — Decision Support',
    explainability_method: 'Rubric-based reasoning against brand tone guide',
    last_validated: '2026-08-23',
    override_rate: 5
  }
]

// -------------------------------------------------------------- career_lattice
export { CAREER_LATTICE as career_lattice }

// -------------------------------------------------------------- override_wins
export const override_wins = []
{
  for (let i = 0; i < 16; i++) {
    const brand = rng.pick(BRANDS)
    override_wins.push({
      id: `ovr_${String(i + 1).padStart(3, '0')}`,
      employee_name: rng.pick(EMPLOYEE_NAMES),
      sub_team: rng.pick(SUB_TEAMS),
      brand_id: brand.id,
      ai_suggestion: rng.pick(OVERRIDE_SUGGESTIONS),
      override_reason: rng.pick(OVERRIDE_REASONS),
      outcome: rng.pick(OVERRIDE_OUTCOMES),
      date: simulatedDate()
    })
  }
}

// ------------------------------------------------------------- certification_history
const CERT_DRAFT_EXCERPTS = [
  'Hey! Totally get the frustration, we\'ll sort this out for you right away, no worries at all!',
  'We regret to inform you that your request has been processed in accordance with policy.',
  'Thank you for your patience — I\'ve gone ahead and applied the exchange, and I\'ll follow up personally once it ships.',
  'lol yeah that sizing chart is honestly kind of a mess sometimes, sorry about that 😅',
  'Dear Valued Customer, kindly be advised that your refund shall be processed within 5-7 business days.',
  'I completely understand how that would be disappointing — here\'s exactly what I\'m doing to fix it right now.',
  'Not sure why that happened tbh, but I\'ll escalate it and get back to you soon.',
  'It would be our pleasure to assist you further; please do not hesitate to reach out with any additional questions.'
]
const CERT_REASONS_PASS = [
  'Tone is warm and on-brand, no policy concerns.',
  'Clear, empathetic, and consistent with the brand\'s voice guide.',
  'Professional and reassuring without over-apologizing.',
  'Matches the brand\'s customer-first tone with appropriate formality.'
]
const CERT_REASONS_FAIL = [
  'Tone is too casual/slang-heavy for this brand\'s formal voice guide.',
  'Reads as overly generic and impersonal for an Advisor-Mediated brand.',
  'Lacks the warmth expected of this brand\'s customer interactions.',
  'Uses hedging language ("not sure why") that undermines trust.'
]

export const certification_history = []
{
  for (let i = 0; i < 12; i++) {
    const brand = rng.pick(BRANDS)
    const draft_excerpt = rng.pick(CERT_DRAFT_EXCERPTS)
    const verdict = rng.bool(0.65) ? 'Pass' : 'Fail'
    const reason = verdict === 'Pass' ? rng.pick(CERT_REASONS_PASS) : rng.pick(CERT_REASONS_FAIL)
    certification_history.push({
      id: `cert_${String(i + 1).padStart(3, '0')}`,
      brand_id: brand.id,
      draft_excerpt,
      verdict,
      reason,
      date: simulatedDate()
    })
  }
}

// -------------------------------------------------------------- signal_insights
const PAST_INSIGHT_TEXTS = [
  'Multiple reviews flag the Outerwear category running small in the shoulder for Athletic archetypes — recommend a spec review with the supplier.',
  'Footwear width complaints cluster around the Plus Curvy and Broad Athletic archetypes — consider a wide-fit variant.',
  'Dresses show a recurring "runs large in the waist" pattern for Petite archetypes — flag for the next size-chart revision.',
  'Bottoms inseam length is the top fit complaint this quarter — recommend adding a length-specific size guide callout.'
]
export const signal_insights = []
{
  for (let i = 0; i < 4; i++) {
    const brand = rng.pick(BRANDS)
    signal_insights.push({
      id: `insight_${String(i + 1).padStart(3, '0')}`,
      brand_id: brand.id,
      insight_text: PAST_INSIGHT_TEXTS[i % PAST_INSIGHT_TEXTS.length],
      sent_to: rng.pick(['Merchandising', 'Design', 'Merchandising & Design']),
      date: simulatedDate()
    })
  }
}

// ------------------------------------------------------------------- exports
export function buildSeedData() {
  return {
    brands, archetypes, fit_matrix, confidence_adjustment_log,
    customers, products, orders, returns, reviews, cases,
    capacity_ledger_tasks, model_registry, career_lattice: CAREER_LATTICE, override_wins,
    certification_history, signal_insights
  }
}

export { fitMatrixLookup }
