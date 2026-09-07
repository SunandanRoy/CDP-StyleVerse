// Client-side mock of server/index.js + server/routes/gemini.js — used only
// in the standalone single-file artifact build (npm run build:artifact),
// where there is no Express backend and no server-held Gemini API key.
// Mirrors the real API's routes, filtering and response shapes exactly so
// every page component (which talks to src/lib/api.js) behaves identically
// whether it's hitting the real server or this in-browser router.
import { buildSeedData } from '../../server/data/seed.js'
import { computeProductConfidence } from '../../server/lib/scoring.js'
import { BRANDS } from '../../server/data/brands.js'

const seed = buildSeedData()
export const db = {
  ...seed,
  productsById: new Map(seed.products.map((p) => [p.id, p])),
  customersById: new Map(seed.customers.map((c) => [c.id, c])),
  ordersById: new Map(seed.orders.map((o) => [o.id, o])),
  brandsById: new Map(seed.brands.map((b) => [b.id, b])),
  archetypesById: new Map(seed.archetypes.map((a) => [a.id, a]))
}

const DIAL_DEFAULTS = {
  speedstyle: { automation_frequency: 85, tone: 'Energetic', proactivity_threshold: 70, escalation_threshold: 80 },
  urbanedge: { automation_frequency: 55, tone: 'Professional', proactivity_threshold: 50, escalation_threshold: 60 },
  maisonluxe: { automation_frequency: 20, tone: 'Warm & Refined', proactivity_threshold: 30, escalation_threshold: 20 },
  ecoweave: { automation_frequency: 40, tone: 'Warm & Honest', proactivity_threshold: 55, escalation_threshold: 65 },
  threadbasics: { automation_frequency: 90, tone: 'Straightforward', proactivity_threshold: 75, escalation_threshold: 85 }
}
const dialSettings = new Map(
  BRANDS.map((b) => [b.id, { brand_id: b.id, ...DIAL_DEFAULTS[b.id], disclosure_mode: b.disclosure_mode }])
)

function customerChannelGroup(c) {
  if (c.channels.length === 2) return 'bridged'
  return c.channels[0] === 'D2C' ? 'd2c_only' : 'marketplace_only'
}

function ok(body) {
  return Promise.resolve(body)
}
function notFound(msg) {
  const err = new Error(msg)
  err.status = 404
  return Promise.reject(err)
}

// ---- GET routes: pathname (with :params) -> handler(params, query) ----
const GET_ROUTES = [
  [/^\/brands$/, () => ok(db.brands)],
  [/^\/brands\/([^/]+)$/, ([id]) => (db.brandsById.get(id) ? ok(db.brandsById.get(id)) : notFound('brand not found'))],
  [
    /^\/archetypes$/,
    () => ok(db.archetypes.map((a) => ({ ...a, member_count: db.customers.filter((c) => c.archetype_id === a.id).length })))
  ],
  [
    /^\/fit-matrix$/,
    (_p, q) => {
      let rows = db.fit_matrix
      if (q.category) rows = rows.filter((r) => r.category === q.category)
      if (q.archetype_id) rows = rows.filter((r) => r.archetype_id === q.archetype_id)
      return ok(rows)
    }
  ],
  [
    /^\/confidence-adjustment-log$/,
    (_p, q) => {
      let rows = db.confidence_adjustment_log
      if (q.category) rows = rows.filter((r) => r.category === q.category)
      if (q.archetype_id) rows = rows.filter((r) => r.archetype_id === q.archetype_id)
      return ok(rows)
    }
  ],
  [
    /^\/customers$/,
    (_p, q) => {
      let rows = db.customers
      if (q.brand_id) rows = rows.filter((c) => c.brand_id === q.brand_id)
      if (q.channel_type) rows = rows.filter((c) => customerChannelGroup(c) === q.channel_type)
      if (q.archetype_id) rows = rows.filter((c) => c.archetype_id === q.archetype_id)
      if (q.search) {
        const s = q.search.toLowerCase()
        rows = rows.filter((c) => c.name.toLowerCase().includes(s) || c.id.includes(s) || (c.loyalty_id || '').toLowerCase().includes(s))
      }
      return ok(rows.map((c) => ({ ...c, channel_group: customerChannelGroup(c) })))
    }
  ],
  [
    /^\/customers\/([^/]+)$/,
    ([id]) => {
      const customer = db.customersById.get(id)
      if (!customer) return notFound('customer not found')
      const orders = db.orders.filter((o) => o.customer_id === customer.id)
      const orderIds = new Set(orders.map((o) => o.id))
      const returns = db.returns.filter((r) => orderIds.has(r.order_id))
      const cases = db.cases.filter((c) => c.customer_id === customer.id)
      const timeline = [
        ...orders.map((o) => ({ type: 'order', date: o.date, ref: o })),
        ...returns.map((r) => ({ type: 'return', date: orders.find((o) => o.id === r.order_id)?.date || '', ref: r })),
        ...cases.map((c) => ({ type: 'case', date: c.channel_log[0]?.timestamp?.slice(0, 10) || '', ref: c }))
      ].sort((a, b) => (a.date < b.date ? 1 : -1))
      return ok({ ...customer, channel_group: customerChannelGroup(customer), orders, returns, cases, timeline })
    }
  ],
  [
    /^\/products$/,
    (_p, q) => {
      let rows = db.products
      if (q.brand_id) rows = rows.filter((p) => p.brand_id === q.brand_id)
      if (q.category) rows = rows.filter((p) => p.category === q.category)
      if (q.search) {
        const s = q.search.toLowerCase()
        rows = rows.filter((p) => p.name.toLowerCase().includes(s))
      }
      return ok(rows)
    }
  ],
  [/^\/products\/([^/]+)$/, ([id]) => (db.productsById.get(id) ? ok(db.productsById.get(id)) : notFound('product not found'))],
  [
    /^\/confidence\/([^/]+)$/,
    ([productId], q) => {
      const product = db.productsById.get(productId)
      const archetypeId = q.archetype_id || db.archetypes[0].id
      if (!product) return notFound('product not found')
      if (!db.archetypesById.get(archetypeId)) return Promise.reject(Object.assign(new Error('invalid archetype_id'), { status: 400 }))
      const signals = computeProductConfidence(product, archetypeId, db)
      return ok({ product_id: product.id, archetype_id: archetypeId, ...signals })
    }
  ],
  [
    /^\/orders$/,
    (_p, q) => {
      let rows = db.orders
      if (q.customer_id) rows = rows.filter((o) => o.customer_id === q.customer_id)
      if (q.channel) rows = rows.filter((o) => o.channel === q.channel)
      if (q.status) rows = rows.filter((o) => o.status === q.status)
      if (q.brand_id) rows = rows.filter((o) => db.customersById.get(o.customer_id)?.brand_id === q.brand_id)
      return ok(rows.map((o) => ({ ...o, product_name: db.productsById.get(o.product_id)?.name, customer_name: db.customersById.get(o.customer_id)?.name })))
    }
  ],
  [
    /^\/returns$/,
    (_p, q) => {
      let rows = db.returns
      if (q.reason_code) rows = rows.filter((r) => r.reason_code === q.reason_code)
      if (q.intercepted !== undefined) rows = rows.filter((r) => String(r.intercepted) === q.intercepted)
      if (q.brand_id) {
        rows = rows.filter((r) => {
          const order = db.ordersById.get(r.order_id)
          const c = order && db.customersById.get(order.customer_id)
          return c && c.brand_id === q.brand_id
        })
      }
      if (q.category) {
        rows = rows.filter((r) => {
          const order = db.ordersById.get(r.order_id)
          const product = order && db.productsById.get(order.product_id)
          return product && product.category === q.category
        })
      }
      return ok(
        rows.map((r) => {
          const order = db.ordersById.get(r.order_id)
          const customer = order && db.customersById.get(order.customer_id)
          const product = order && db.productsById.get(order.product_id)
          return { ...r, order, customer_name: customer?.name, product_name: product?.name, category: product?.category, brand_id: customer?.brand_id }
        })
      )
    }
  ],
  [
    /^\/reviews$/,
    (_p, q) => {
      let rows = db.reviews
      if (q.product_id) rows = rows.filter((r) => r.product_id === q.product_id)
      if (q.mentions_fit !== undefined) rows = rows.filter((r) => String(r.mentions_fit) === q.mentions_fit)
      if (q.brand_id) rows = rows.filter((r) => db.productsById.get(r.product_id)?.brand_id === q.brand_id)
      return ok(rows.map((r) => ({ ...r, product_name: db.productsById.get(r.product_id)?.name })))
    }
  ],
  [
    /^\/cases$/,
    (_p, q) => {
      let rows = db.cases
      if (q.status) rows = rows.filter((c) => c.status === q.status)
      if (q.brand_id) rows = rows.filter((c) => db.customersById.get(c.customer_id)?.brand_id === q.brand_id)
      return ok(rows.map((c) => ({ ...c, customer_name: db.customersById.get(c.customer_id)?.name, brand_id: db.customersById.get(c.customer_id)?.brand_id })))
    }
  ],
  [
    /^\/cases\/([^/]+)$/,
    ([id]) => {
      const kase = db.cases.find((c) => c.id === id)
      if (!kase) return notFound('case not found')
      return ok({ ...kase, customer: db.customersById.get(kase.customer_id) })
    }
  ],
  [
    /^\/capacity-ledger$/,
    (_p, q) => {
      let rows = db.capacity_ledger_tasks
      if (q.sub_team) rows = rows.filter((t) => t.sub_team === q.sub_team)
      if (q.gate) rows = rows.filter((t) => t.gate === q.gate)
      return ok(rows)
    }
  ],
  [/^\/model-registry$/, () => ok(db.model_registry)],
  [/^\/career-lattice$/, () => ok(db.career_lattice)],
  [
    /^\/override-wins$/,
    (_p, q) => {
      let rows = db.override_wins
      if (q.brand_id) rows = rows.filter((r) => r.brand_id === q.brand_id)
      if (q.sub_team) rows = rows.filter((r) => r.sub_team === q.sub_team)
      return ok(rows)
    }
  ],
  [
    /^\/certification-history$/,
    (_p, q) => {
      let rows = db.certification_history
      if (q.brand_id) rows = rows.filter((r) => r.brand_id === q.brand_id)
      return ok(rows)
    }
  ],
  [
    /^\/signal-insights$/,
    (_p, q) => {
      let rows = db.signal_insights
      if (q.brand_id) rows = rows.filter((r) => r.brand_id === q.brand_id)
      return ok(rows)
    }
  ],
  [
    /^\/dial\/([^/]+)$/,
    ([brandId]) => {
      const settings = dialSettings.get(brandId)
      if (!settings) return notFound('brand not found')
      const brand = db.brandsById.get(brandId)
      return ok({ ...settings, ai_tooling_mode: brand.ai_tooling_mode, hard_limit: brand.hard_limit })
    }
  ],
  [
    /^\/dashboard\/([^/]+)$/,
    ([brandId]) => {
      const brand = db.brandsById.get(brandId)
      if (!brand) return notFound('brand not found')
      const brandCustomers = db.customers.filter((c) => c.brand_id === brand.id)
      const custIds = new Set(brandCustomers.map((c) => c.id))
      const brandOrders = db.orders.filter((o) => custIds.has(o.customer_id))
      const orderIds = new Set(brandOrders.map((o) => o.id))
      const brandReturns = db.returns.filter((r) => orderIds.has(r.order_id))
      const brandCases = db.cases.filter((c) => custIds.has(c.customer_id))
      const openCases = brandCases.filter((c) => !['Resolved', 'Closed'].includes(c.status))
      const brandProducts = db.products.filter((p) => p.brand_id === brand.id)
      let scoreSum = 0
      let scoreCount = 0
      for (const product of brandProducts) {
        for (const archetype of db.archetypes) {
          const sig = computeProductConfidence(product, archetype.id, db)
          scoreSum += sig.confidence_score
          scoreCount++
        }
      }
      const avg_confidence_score = scoreCount ? Math.round(scoreSum / scoreCount) : 0
      const computed_return_rate = brandOrders.length ? Math.round((brandReturns.length / brandOrders.length) * 1000) / 10 : 0
      return ok({
        brand_id: brand.id,
        customers: brandCustomers.length,
        orders: brandOrders.length,
        open_cases: openCases.length,
        computed_return_rate,
        avg_confidence_score,
        benchmark: {
          nps: brand.nps, return_rate: brand.return_rate, monthly_queries: brand.monthly_queries,
          resolution_hrs: brand.resolution_hrs, top_query_type: brand.top_query_type
        }
      })
    }
  ]
]

// ---- POST/PATCH routes ----
const POST_ROUTES = [
  [
    /^\/returns\/simulate$/,
    (_p, _q, body) => {
      const { customer_id, order_id, reason_code } = body
      const customer = db.customersById.get(customer_id)
      const order = db.ordersById.get(order_id)
      if (!customer || !order) return notFound('customer or order not found')
      const product = db.productsById.get(order.product_id)
      const brand = db.brandsById.get(customer.brand_id)
      const isFitDriven = reason_code === 'fit_runs_small' || reason_code === 'fit_runs_large'
      let intercepted, exchange_offered, exchange_accepted, rationale
      if (isFitDriven) {
        intercepted = true
        exchange_offered = true
        const suggestedSize = reason_code === 'fit_runs_small' ? 'one size up' : 'one size down'
        exchange_accepted = brand.ai_tooling_mode !== 'rules_engine_only'
        rationale = `Fit-driven return detected for ${product?.name}. Interception logic would offer an exchange (${suggestedSize}) using ${customer.name}'s Fit Passport before the return is finalized.`
      } else {
        intercepted = false
        exchange_offered = reason_code === 'change_of_mind'
        rationale = `Reason code "${reason_code}" is not fit-driven, so interception logic would route this straight to standard return processing${exchange_offered ? ', with an optional exchange offer' : ''}.`
      }
      return ok({ simulated: true, customer_id, order_id, reason_code, intercepted, exchange_offered, exchange_accepted, rationale })
    }
  ],
  [
    /^\/certification-history$/,
    (_p, _q, body) => {
      const entry = { id: `cert_${String(db.certification_history.length + 1).padStart(3, '0')}`, ...body, date: new Date().toISOString().slice(0, 10) }
      db.certification_history.unshift(entry)
      return ok(entry)
    }
  ],
  [
    /^\/signal-insights$/,
    (_p, _q, body) => {
      const entry = {
        id: `insight_${String(db.signal_insights.length + 1).padStart(3, '0')}`,
        brand_id: body.brand_id, insight_text: body.insight_text, sent_to: body.sent_to || 'Merchandising & Design',
        date: new Date().toISOString().slice(0, 10)
      }
      db.signal_insights.unshift(entry)
      return ok(entry)
    }
  ]
]

const PATCH_ROUTES = [
  [
    /^\/dial\/([^/]+)$/,
    ([brandId], _q, body) => {
      const current = dialSettings.get(brandId)
      if (!current) return notFound('brand not found')
      const allowed = ['automation_frequency', 'tone', 'proactivity_threshold', 'escalation_threshold', 'disclosure_mode']
      const next = { ...current }
      for (const k of allowed) if (body[k] !== undefined) next[k] = body[k]
      dialSettings.set(brandId, next)
      const brand = db.brandsById.get(brandId)
      return ok({ ...next, ai_tooling_mode: brand.ai_tooling_mode, hard_limit: brand.hard_limit })
    }
  ]
]

function parsePath(fullPath) {
  const [pathname, qs] = fullPath.split('?')
  const query = Object.fromEntries(new URLSearchParams(qs || ''))
  return { pathname, query }
}

function matchRoute(routes, pathname) {
  for (const [re, handler] of routes) {
    const m = pathname.match(re)
    if (m) return { handler, params: m.slice(1) }
  }
  return null
}

export function mockRequest(method, fullPath, body) {
  const { pathname, query } = parsePath(fullPath)
  const routes = method === 'GET' ? GET_ROUTES : method === 'PATCH' ? PATCH_ROUTES : POST_ROUTES
  if (pathname.startsWith('/gemini/')) return mockGemini(pathname.replace('/gemini/', ''), body)
  const match = matchRoute(routes, pathname)
  if (!match) return Promise.reject(new Error(`No mock route for ${method} ${pathname}`))
  return match.handler(match.params, query, body || {})
}

// ---- Gemini simulation: always runs the same fallback/rules-engine logic
// the real backend uses when no GEMINI_API_KEY is configured, since a
// shareable static artifact can't hold a server-side secret. Brand-routing
// and labels are identical to the deployed app's no-key behavior. ----
const FALLBACKS = {
  'explain-score': 'This score reflects a strong fit-match with your archetype and positive feedback from shoppers with a similar profile.',
  'draft-outreach': "Hi [name], we noticed a possible delay with your recent order and wanted to reach out before you had to ask. We're on it — here's what happens next.",
  'certify-voice': 'VERDICT: Pass\nREASON: Tone is warm and on-brand, no policy concerns.',
  'signal-insight': 'Multiple reviews mention fit running small in this category — consider flagging for a sizing review with Merchandising.'
}

function mockGemini(fn, body) {
  if (fn === 'explain-score') {
    const product = db.productsById.get(body.productId)
    const brand = db.brandsById.get(product?.brand_id)
    if (!product || !brand) return notFound('error')
    const signals = computeProductConfidence(product, body.archetypeId, db)
    return ok(routedFallback(brand, 'explain-score', () => `This ${signals.confidence_score}% confidence reflects a ${signals.fit_match_pct}% fit-match for your body profile and a ${signals.social_proof_kept_it_rate}% keep rate among similar shoppers.`, { signals }))
  }
  if (fn === 'draft-outreach') {
    const kase = db.cases.find((c) => c.id === body.caseId)
    const customer = db.customersById.get(kase?.customer_id)
    const brand = db.brandsById.get(customer?.brand_id)
    if (!kase || !customer || !brand) return notFound('error')
    const recentOrder = db.orders.filter((o) => o.customer_id === customer.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    return ok(
      routedFallback(
        brand,
        'draft-outreach',
        () => `Hi ${customer.name.split(' ')[0]}, we noticed ${recentOrder ? `order ${recentOrder.id} is currently "${recentOrder.status}"` : 'a possible delay with your recent order'} and wanted to reach out before you had to ask. We're on it — here's what happens next.`,
        { customer_name: customer.name },
        true
      )
    )
  }
  if (fn === 'certify-voice') {
    const brand = db.brandsById.get(body.brandId)
    if (!brand || !body.draftText) return Promise.reject(Object.assign(new Error('error'), { status: 400 }))
    const dial = dialSettings.get(body.brandId)
    const brandTone = dial?.tone || brand.posture
    return ok(
      routedFallback(brand, 'certify-voice', () => {
        const lower = body.draftText.toLowerCase()
        const casualHits = ['lol', 'tbh', 'yeah', '😅', 'not sure why'].filter((w) => lower.includes(w)).length
        const tooShort = body.draftText.trim().length < 15
        const verdict = casualHits === 0 && !tooShort ? 'Pass' : 'Fail'
        const reason = tooShort
          ? 'Draft is too short to evaluate confidently against the brand voice guide.'
          : casualHits > 0
          ? `Contains ${casualHits} casual phrase(s) inconsistent with a "${brandTone}" tone guide.`
          : `Matches the "${brandTone}" tone guide — clear and on-policy language.`
        return `VERDICT: ${verdict}\nREASON: ${reason}`
      })
    )
  }
  if (fn === 'signal-insight') {
    const brand = db.brandsById.get(body.brandId)
    if (!brand) return notFound('error')
    let batch = db.reviews.filter((r) => r.mentions_fit && db.productsById.get(r.product_id)?.brand_id === body.brandId)
    if (body.productId) batch = batch.filter((r) => r.product_id === body.productId)
    if (batch.length === 0) batch = db.reviews.filter((r) => r.mentions_fit).slice(0, 8)
    return ok(
      routedFallback(brand, 'signal-insight', () => {
        const smallCount = batch.filter((r) => /small|tight/i.test(r.text)).length
        const largeCount = batch.filter((r) => /large|loose/i.test(r.text)).length
        const pattern = smallCount >= largeCount ? 'running small' : 'running large'
        return `${batch.length} fit-related reviews analyzed; the dominant pattern is sizing ${pattern} — recommend a size-chart review with Merchandising for the affected category.`
      }, { sample_size: batch.length })
    )
  }
  return Promise.reject(new Error('unknown gemini function'))
}

function routedFallback(brand, fn, ruleBasedTemplate, extra = {}, noRetrievalSource = false) {
  const mode = brand.ai_tooling_mode
  if (mode === 'rules_engine_only') {
    return { success: true, text: ruleBasedTemplate(), example: false, mode: 'rules_engine', label: 'Rules-engine generated — no LLM used for this brand.', ...extra }
  }
  if (mode === 'retrieval_only') {
    if (noRetrievalSource) {
      return { success: true, text: ruleBasedTemplate(), example: false, mode: 'rules_engine', label: 'Retrieval-grounded template — no generative fallback available for this function.', ...extra }
    }
    return { success: true, text: FALLBACKS[fn], example: true, mode: 'fallback', note: 'No server-side Gemini key in this static build', label: 'Retrieval-grounded — no generative fallback.', ...extra }
  }
  const label = mode === 'internal_llm_only' ? 'Draft only — requires human sign-off before sending' : undefined
  return { success: true, text: FALLBACKS[fn], example: true, mode: 'fallback', note: 'No server-side Gemini key in this static build', label, ...extra }
}
