// Client-side mock of server/index.js + server/routes/gemini.js — used only
// in the standalone single-file artifact build (npm run build:artifact),
// where there is no Express backend and no server-held Gemini API key.
// Mirrors the real API's routes, filtering and response shapes exactly so
// every page component (which talks to src/lib/api.js) behaves identically
// whether it's hitting the real server or this in-browser router. Loads the
// same JSON the server loads via fs — bundled in by Vite at build time so
// the standalone HTML has it inlined with no runtime fetch.
import seedJson from '../../shared/sce-seed.json'
import extJson from '../../shared/console-extension.json'
import { computeProductConfidence } from '../../server/lib/scoring.js'
import { buildDialSettings, applyDialPatch } from '../../shared/dial.js'
import { simulateReturnInterception } from '../../shared/interception.js'
import { certifyVoice } from '../../shared/voice-rubric.mjs'

function flattenFitMatrix(nested) {
  const rows = []
  for (const [category, byArchetype] of Object.entries(nested)) {
    for (const [archetype_id, byZone] of Object.entries(byArchetype)) {
      for (const [zone, fit_direction] of Object.entries(byZone)) {
        rows.push({ category, archetype_id, zone, fit_direction })
      }
    }
  }
  return rows
}

const archetypesById = new Map(seedJson.archetypes.map((a) => [a.id, a]))
function buildFitPassport(c) {
  const archetype = archetypesById.get(c.archetype_id)
  return {
    archetype: archetype?.label || c.archetype_id,
    height_cm: c.height_cm,
    measurements: `${c.bust_in}-${c.waist_in}-${c.hip_in} in (bust-waist-hip)`,
    confidence: c.fit_passport_bridged ? 92 : 78,
    shopping_for: c.id.endsWith('5') || c.id.endsWith('0') ? 'someone else' : 'myself'
  }
}
const customers = seedJson.customers.map((c) => ({
  ...c,
  brand_id: c.brand_affinity,
  fit_passport: buildFitPassport(c),
  fit_passport_status: c.fit_passport_bridged ? `Linked · ${c.loyalty_id}` : 'Not applicable (D2C-native)'
}))

export const db = {
  meta: seedJson.meta,
  brands: seedJson.brands,
  archetypes: seedJson.archetypes,
  categories: seedJson.categories,
  zonesByCategory: seedJson.zonesByCategory,
  fit_matrix_nested: seedJson.fitMatrix,
  fit_matrix: flattenFitMatrix(seedJson.fitMatrix),
  confidence_adjustment_log: seedJson.confidenceAdjustmentLog,
  products: seedJson.products,
  outcomeIndex: seedJson.outcomeIndex,
  customers,
  marketplaceBuyers: seedJson.marketplaceBuyers,
  orders: seedJson.orders,
  returns: seedJson.returns,
  reviews: seedJson.reviews,
  cases: seedJson.cases,
  kpiTable: seedJson.kpiTable,
  workforce: seedJson.workforce,
  careerLattice: seedJson.careerLattice,
  subTeams: seedJson.subTeams,

  employees: extJson.employees,
  capacityTasks: extJson.capacityTasks,
  capacitySummary: extJson.capacitySummary,
  registryComponents: extJson.registryComponents,
  overrideWins: extJson.overrideWins,
  certificationHistory: extJson.certificationHistory,
  modelRegistry: extJson.modelRegistry,
  dialAuditLog: extJson.dialAuditLog,
  signal_insights: []
}
db.productsById = new Map(db.products.map((p) => [p.id, p]))
db.customersById = new Map(db.customers.map((c) => [c.id, c]))
db.ordersById = new Map(db.orders.map((o) => [o.id, o]))
db.brandsById = new Map(db.brands.map((b) => [b.id, b]))
db.archetypesById = new Map(db.archetypes.map((a) => [a.id, a]))

const dialSettings = buildDialSettings(db.brands)

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
      if (q.archetype_id) rows = rows.filter((c) => c.archetype_id === q.archetype_id)
      if (q.search) {
        const s = q.search.toLowerCase()
        rows = rows.filter((c) => c.name.toLowerCase().includes(s) || c.id.includes(s) || (c.loyalty_id || '').toLowerCase().includes(s))
      }
      return ok(rows)
    }
  ],
  [
    /^\/customers\/([^/]+)$/,
    ([id]) => {
      const customer = db.customersById.get(id)
      if (!customer) return notFound('customer not found')
      const orders = db.orders
        .filter((o) => o.customer_id === customer.id)
        .map((o) => ({ ...o, product_name: db.productsById.get(o.product_id)?.name, fit_applicable: db.productsById.get(o.product_id)?.fit_applicable, customer_name: customer.name }))
      const orderIds = new Set(orders.map((o) => o.id))
      const returns = db.returns
        .filter((r) => orderIds.has(r.order_id))
        .map((r) => ({ ...r, product_name: orders.find((o) => o.id === r.order_id)?.product_name }))
      const cases = db.cases.filter((c) => c.customer_id === customer.id)
      const claimedAlias = db.marketplaceBuyers.find((b) => b.pending_claim_for === customer.id || b.claimed_by === customer.id)
      const timeline = [
        ...orders.map((o) => ({ type: 'order', date: o.order_date, ref: o })),
        ...returns.map((r) => ({ type: 'return', date: r.return_date, ref: r })),
        ...cases.map((c) => ({ type: 'case', date: c.channel_log[0]?.date || c.opened_date || '', ref: c }))
      ].sort((a, b) => (a.date < b.date ? 1 : -1))
      return ok({ ...customer, orders, returns, cases, timeline, marketplace_claim: claimedAlias || null })
    }
  ],
  [
    /^\/marketplace-buyers$/,
    (_p, q) => {
      let rows = db.marketplaceBuyers
      if (q.brand_id) rows = rows.filter((b) => b.brand_id === q.brand_id)
      return ok(
        rows.map((b) => ({
          ...b,
          order_count: db.orders.filter((o) => o.buyer_alias === b.buyer_alias).length,
          return_count: db.returns.filter((r) => r.buyer_alias === b.buyer_alias).length
        }))
      )
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
    /^\/confidence-batch$/,
    (_p, q) => {
      const { brand_id, archetype_id } = q
      if (!brand_id || !archetype_id) return Promise.reject(Object.assign(new Error('brand_id and archetype_id are required'), { status: 400 }))
      if (!db.archetypesById.get(archetype_id)) return Promise.reject(Object.assign(new Error('invalid archetype_id'), { status: 400 }))
      const rows = db.products
        .filter((p) => p.brand_id === brand_id)
        .map((p) => ({ product_id: p.id, ...computeProductConfidence(p, archetype_id, db) }))
      return ok(rows)
    }
  ],
  [
    /^\/confidence-demo-archetype$/,
    (_p, q) => {
      const { brand_id } = q
      if (!brand_id) return Promise.reject(Object.assign(new Error('brand_id is required'), { status: 400 }))
      const brandProducts = db.products.filter((p) => p.brand_id === brand_id && p.fit_applicable)
      for (const archetype of db.archetypes) {
        const scores = brandProducts.map((p) => computeProductConfidence(p, archetype.id, db).confidence_score).sort((a, b) => a - b)
        if (scores.slice(0, 3).some((s) => s < 60)) return ok({ archetype_id: archetype.id })
      }
      return ok({ archetype_id: db.archetypes[0].id })
    }
  ],
  [
    /^\/orders$/,
    (_p, q) => {
      let rows = db.orders
      if (q.customer_id) rows = rows.filter((o) => o.customer_id === q.customer_id)
      if (q.channel) rows = rows.filter((o) => o.channel === q.channel)
      if (q.status) rows = rows.filter((o) => o.status === q.status)
      if (q.brand_id) rows = rows.filter((o) => o.brand_id === q.brand_id)
      return ok(rows.map((o) => ({ ...o, product_name: db.productsById.get(o.product_id)?.name, customer_name: o.customer_id ? db.customersById.get(o.customer_id)?.name : null })))
    }
  ],
  [
    /^\/returns$/,
    (_p, q) => {
      let rows = db.returns
      if (q.reason_code) rows = rows.filter((r) => r.reason_code === q.reason_code)
      if (q.channel) rows = rows.filter((r) => r.channel === q.channel)
      if (q.intercepted !== undefined) rows = rows.filter((r) => String(r.intercepted) === q.intercepted)
      if (q.brand_id) rows = rows.filter((r) => db.ordersById.get(r.order_id)?.brand_id === q.brand_id)
      if (q.category) rows = rows.filter((r) => db.productsById.get(r.product_id)?.category === q.category)
      return ok(
        rows.map((r) => {
          const order = db.ordersById.get(r.order_id)
          const product = db.productsById.get(r.product_id)
          const customer = r.customer_id ? db.customersById.get(r.customer_id) : null
          return { ...r, order, customer_name: customer?.name || null, product_name: product?.name, category: product?.category, brand_id: order?.brand_id }
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
      if (q.brand_id) rows = rows.filter((r) => r.brand_id === q.brand_id)
      return ok(rows.map((r) => ({ ...r, product_name: db.productsById.get(r.product_id)?.name })))
    }
  ],
  [
    /^\/cases$/,
    (_p, q) => {
      let rows = db.cases
      if (q.status) rows = rows.filter((c) => c.status === q.status)
      if (q.brand_id) rows = rows.filter((c) => c.brand_id === q.brand_id)
      return ok(rows.map((c) => ({ ...c, customer_name: db.customersById.get(c.customer_id)?.name })))
    }
  ],
  [
    /^\/cases\/([^/]+)$/,
    ([id]) => {
      const kase = db.cases.find((c) => c.id === id)
      if (!kase) return notFound('case not found')
      const customer = db.customersById.get(kase.customer_id)
      return ok({ ...kase, customer, customer_name: customer?.name })
    }
  ],
  [
    /^\/capacity-ledger$/,
    (_p, q) => {
      let rows = db.capacityTasks
      if (q.sub_team) rows = rows.filter((t) => t.sub_team === q.sub_team)
      if (q.gate) rows = rows.filter((t) => t.gate === q.gate)
      return ok({ tasks: rows, summary: db.capacitySummary })
    }
  ],
  [/^\/model-registry$/, () => ok(db.modelRegistry)],
  [
    /^\/registry-components$/,
    (_p, q) => {
      let rows = db.registryComponents
      if (q.brand_id) rows = rows.filter((r) => r.brand_id === q.brand_id)
      return ok(rows)
    }
  ],
  [/^\/career-lattice$/, () => ok(db.careerLattice)],
  [/^\/sub-teams$/, () => ok(db.subTeams)],
  [/^\/kpi-table$/, () => ok(db.kpiTable)],
  [/^\/workforce$/, () => ok(db.workforce)],
  [
    /^\/employees$/,
    (_p, q) => {
      let rows = db.employees
      if (q.sub_team) rows = rows.filter((e) => e.sub_team === q.sub_team)
      return ok(rows)
    }
  ],
  [
    /^\/override-wins$/,
    (_p, q) => {
      let rows = db.overrideWins
      if (q.brand_id) rows = rows.filter((r) => r.brand_id === q.brand_id)
      if (q.sub_team) rows = rows.filter((r) => r.sub_team === q.sub_team)
      return ok(rows)
    }
  ],
  [
    /^\/certification-history$/,
    (_p, q) => {
      let rows = db.certificationHistory
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
    /^\/dial-audit-log$/,
    (_p, q) => {
      let rows = db.dialAuditLog
      if (q.brand_id) rows = rows.filter((r) => r.brand_id === q.brand_id)
      return ok(rows)
    }
  ],
  [
    /^\/dashboard\/([^/]+)$/,
    ([brandId]) => {
      const brand = db.brandsById.get(brandId)
      if (!brand) return notFound('brand not found')
      const brandCustomers = db.customers.filter((c) => c.brand_id === brand.id)
      const brandOrders = db.orders.filter((o) => o.brand_id === brand.id)
      const brandReturns = db.returns.filter((r) => db.ordersById.get(r.order_id)?.brand_id === brand.id)
      const brandCases = db.cases.filter((c) => c.brand_id === brand.id)
      const openCases = brandCases.filter((c) => !['Resolved', 'Closed'].includes(c.status))
      const brandProducts = db.products.filter((p) => p.brand_id === brand.id && p.fit_applicable)
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
          nps: brand.nps, return_rate_target: brand.return_rate_target, monthly_queries: brand.monthly_queries,
          resolution_hrs: brand.resolution_hrs, top_query_type: brand.top_query_type
        },
        kpiTable: db.kpiTable
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
      const { confidence_score } = computeProductConfidence(product, customer.archetype_id, db)
      const result = simulateReturnInterception({ customer, order, product, brand, reasonCode: reason_code, confidenceScore: confidence_score })
      return ok({ simulated: true, customer_id, order_id, reason_code, ...result })
    }
  ],
  [
    /^\/certification-history$/,
    (_p, _q, body) => {
      const entry = { id: `cert_${String(db.certificationHistory.length + 1).padStart(3, '0')}`, ...body, date: new Date().toISOString().slice(0, 10) }
      db.certificationHistory.unshift(entry)
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
      const { reason, changed_by, ...patch } = body
      const next = applyDialPatch(brandId, current, patch)
      dialSettings.set(brandId, next)
      const changedKeys = Object.keys(patch).filter((k) => current[k] !== next[k])
      for (const key of changedKeys) {
        db.dialAuditLog.unshift({
          id: `dial_log_rt_${db.dialAuditLog.length + 1}`,
          brand_id: brandId, parameter: key, before: current[key], after: next[key],
          reason: reason || '(no reason given)', changed_by: changed_by || 'Console user',
          date: new Date().toISOString().slice(0, 10)
        })
      }
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
// shareable static artifact can't hold a server-side secret. The voice
// rubric (C3) guards certify-voice identically to the live server. ----
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
    const brand = db.brandsById.get(kase?.brand_id)
    if (!kase || !customer || !brand) return notFound('error')
    const recentOrder = db.orders.filter((o) => o.customer_id === customer.id).sort((a, b) => (a.order_date < b.order_date ? 1 : -1))[0]
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
    const { verdict, reason } = certifyVoice(body.draftText, brand)
    return ok(routedFallback(brand, 'certify-voice', () => `VERDICT: ${verdict}\nREASON: ${reason}`))
  }
  if (fn === 'signal-insight') {
    const brand = db.brandsById.get(body.brandId)
    if (!brand) return notFound('error')
    let batch = db.reviews.filter((r) => r.mentions_fit && r.brand_id === body.brandId)
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
