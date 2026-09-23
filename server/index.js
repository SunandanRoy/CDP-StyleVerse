import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

import { db, getDialSettings, updateDialSettings } from './data/db.js'
import { computeProductConfidence } from './lib/scoring.js'
import { runStartupImageHealthCheck } from './data/imageLibrary.js'
import { simulateReturnInterception } from '../shared/interception.js'
import geminiRouter from './routes/gemini.js'
import { DEMO_TODAY } from '../shared/contract-constants.mjs'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

// ---------------------------------------------------------------- brands
app.get('/api/brands', (req, res) => res.json(db.brands))
app.get('/api/brands/:id', (req, res) => {
  const brand = db.brandsById.get(req.params.id)
  if (!brand) return res.status(404).json({ error: 'brand not found' })
  res.json(brand)
})

// ---------------------------------------------------------------- archetypes
app.get('/api/archetypes', (req, res) => {
  const withCounts = db.archetypes.map((a) => ({
    ...a,
    member_count: db.customers.filter((c) => c.archetype_id === a.id).length
  }))
  res.json(withCounts)
})

// ---------------------------------------------------------------- fit_matrix
app.get('/api/fit-matrix', (req, res) => {
  let rows = db.fit_matrix
  if (req.query.category) rows = rows.filter((r) => r.category === req.query.category)
  if (req.query.archetype_id) rows = rows.filter((r) => r.archetype_id === req.query.archetype_id)
  res.json(rows)
})

app.get('/api/confidence-adjustment-log', (req, res) => {
  let rows = db.confidence_adjustment_log
  if (req.query.category) rows = rows.filter((r) => r.category === req.query.category)
  if (req.query.archetype_id) rows = rows.filter((r) => r.archetype_id === req.query.archetype_id)
  res.json(rows)
})

// ---------------------------------------------------------------- customers
// C1 — D2C-identified customers only. Marketplace-only buyers are a
// separate, order-level-only entity (/api/marketplace-buyers) with no name,
// archetype, or Fit Passport ever exposed.
app.get('/api/customers', (req, res) => {
  let rows = db.customers
  const { brand_id, search, archetype_id } = req.query
  if (brand_id) rows = rows.filter((c) => c.brand_id === brand_id)
  if (archetype_id) rows = rows.filter((c) => c.archetype_id === archetype_id)
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q) || (c.loyalty_id || '').toLowerCase().includes(q))
  }
  res.json(rows)
})

app.get('/api/customers/:id', (req, res) => {
  const customer = db.customersById.get(req.params.id)
  if (!customer) return res.status(404).json({ error: 'customer not found' })

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

  res.json({ ...customer, orders, returns, cases, timeline, marketplace_claim: claimedAlias || null })
})

// C1/D5 — marketplace-only buyers: order-level data only, never a name or archetype.
app.get('/api/marketplace-buyers', (req, res) => {
  let rows = db.marketplaceBuyers
  if (req.query.brand_id) rows = rows.filter((b) => b.brand_id === req.query.brand_id)
  res.json(
    rows.map((b) => {
      const orders = db.orders.filter((o) => o.buyer_alias === b.buyer_alias)
      const returns = db.returns.filter((r) => r.buyer_alias === b.buyer_alias)
      return { ...b, order_count: orders.length, return_count: returns.length }
    })
  )
})

// ---------------------------------------------------------------- products
app.get('/api/products', (req, res) => {
  let rows = db.products
  const { brand_id, category, search } = req.query
  if (brand_id) rows = rows.filter((p) => p.brand_id === brand_id)
  if (category) rows = rows.filter((p) => p.category === category)
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter((p) => p.name.toLowerCase().includes(q))
  }
  res.json(rows)
})

app.get('/api/products/:id', (req, res) => {
  const product = db.productsById.get(req.params.id)
  if (!product) return res.status(404).json({ error: 'product not found' })
  res.json(product)
})

// ---------------------------------------------------------------- confidence
app.get('/api/confidence/:productId', (req, res) => {
  const product = db.productsById.get(req.params.productId)
  const archetypeId = req.query.archetype_id || db.archetypes[0].id
  if (!product) return res.status(404).json({ error: 'product not found' })
  if (!db.archetypesById.get(archetypeId)) return res.status(400).json({ error: 'invalid archetype_id' })
  const signals = computeProductConfidence(product, archetypeId, db)
  res.json({ product_id: product.id, archetype_id: archetypeId, ...signals })
})

app.get('/api/confidence-batch', (req, res) => {
  const { brand_id, archetype_id } = req.query
  if (!brand_id || !archetype_id) return res.status(400).json({ error: 'brand_id and archetype_id are required' })
  if (!db.archetypesById.get(archetype_id)) return res.status(400).json({ error: 'invalid archetype_id' })
  const rows = db.products
    .filter((p) => p.brand_id === brand_id)
    .map((p) => ({ product_id: p.id, ...computeProductConfidence(p, archetype_id, db) }))
  res.json(rows)
})

app.get('/api/confidence-demo-archetype', (req, res) => {
  const { brand_id } = req.query
  if (!brand_id) return res.status(400).json({ error: 'brand_id is required' })
  const brandProducts = db.products.filter((p) => p.brand_id === brand_id && p.fit_applicable)
  for (const archetype of db.archetypes) {
    const scores = brandProducts.map((p) => computeProductConfidence(p, archetype.id, db).confidence_score).sort((a, b) => a - b)
    if (scores.slice(0, 3).some((s) => s < 60)) return res.json({ archetype_id: archetype.id })
  }
  res.json({ archetype_id: db.archetypes[0].id })
})

// ---------------------------------------------------------------- orders
app.get('/api/orders', (req, res) => {
  let rows = db.orders
  const { brand_id, channel, status, customer_id } = req.query
  if (customer_id) rows = rows.filter((o) => o.customer_id === customer_id)
  if (channel) rows = rows.filter((o) => o.channel === channel)
  if (status) rows = rows.filter((o) => o.status === status)
  if (brand_id) rows = rows.filter((o) => o.brand_id === brand_id)
  res.json(
    rows.map((o) => ({
      ...o,
      product_name: db.productsById.get(o.product_id)?.name,
      customer_name: o.customer_id ? db.customersById.get(o.customer_id)?.name : null
    }))
  )
})

// ---------------------------------------------------------------- returns
app.get('/api/returns', (req, res) => {
  let rows = db.returns
  const { brand_id, reason_code, intercepted, category, channel } = req.query
  if (reason_code) rows = rows.filter((r) => r.reason_code === reason_code)
  if (channel) rows = rows.filter((r) => r.channel === channel)
  if (intercepted !== undefined) rows = rows.filter((r) => String(r.intercepted) === intercepted)
  if (brand_id) {
    rows = rows.filter((r) => db.ordersById.get(r.order_id)?.brand_id === brand_id)
  }
  if (category) {
    rows = rows.filter((r) => db.productsById.get(r.product_id)?.category === category)
  }
  res.json(
    rows.map((r) => {
      const order = db.ordersById.get(r.order_id)
      const product = db.productsById.get(r.product_id)
      const customer = r.customer_id ? db.customersById.get(r.customer_id) : null
      return { ...r, order, customer_name: customer?.name || null, product_name: product?.name, category: product?.category, brand_id: order?.brand_id }
    })
  )
})

// Module 4 — Simulate a Return (read-only, never mutates seed data)
app.post('/api/returns/simulate', (req, res) => {
  const { customer_id, order_id, reason_code } = req.body
  const customer = db.customersById.get(customer_id)
  const order = db.ordersById.get(order_id)
  if (!customer || !order) return res.status(404).json({ error: 'customer or order not found' })
  const product = db.productsById.get(order.product_id)
  const brand = db.brandsById.get(customer.brand_id)
  const { confidence_score } = computeProductConfidence(product, customer.archetype_id, db)

  const result = simulateReturnInterception({ customer, order, product, brand, reasonCode: reason_code, confidenceScore: confidence_score })

  res.json({ simulated: true, customer_id, order_id, reason_code, ...result })
})

// ---------------------------------------------------------------- reviews
app.get('/api/reviews', (req, res) => {
  let rows = db.reviews
  const { brand_id, product_id, mentions_fit } = req.query
  if (product_id) rows = rows.filter((r) => r.product_id === product_id)
  if (mentions_fit !== undefined) rows = rows.filter((r) => String(r.mentions_fit) === mentions_fit)
  if (brand_id) rows = rows.filter((r) => r.brand_id === brand_id)
  res.json(rows.map((r) => ({ ...r, product_name: db.productsById.get(r.product_id)?.name })))
})

// ---------------------------------------------------------------- cases
app.get('/api/cases', (req, res) => {
  let rows = db.cases
  const { brand_id, status } = req.query
  if (status) rows = rows.filter((c) => c.status === status)
  if (brand_id) rows = rows.filter((c) => c.brand_id === brand_id)
  res.json(rows.map((c) => ({ ...c, customer_name: db.customersById.get(c.customer_id)?.name })))
})

app.get('/api/cases/:id', (req, res) => {
  const kase = db.cases.find((c) => c.id === req.params.id)
  if (!kase) return res.status(404).json({ error: 'case not found' })
  const customer = db.customersById.get(kase.customer_id)
  res.json({ ...kase, customer, customer_name: customer?.name })
})

// D3 — Grievance Radar: draft outreach -> "mark sent" turns the case
// proactive (contacted before the customer complained) instead of reactive.
app.post('/api/cases/:id/proactive-contact', (req, res) => {
  const kase = db.cases.find((c) => c.id === req.params.id)
  if (!kase) return res.status(404).json({ error: 'case not found' })
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'message is required' })
  kase.proactive = true
  kase.contacted_date = DEMO_TODAY
  kase.channel_log = [...kase.channel_log, { from: 'agent', text: message, date: DEMO_TODAY }]
  res.json(kase)
})

// ---------------------------------------------------------------- capacity ledger (C9)
app.get('/api/capacity-ledger', (req, res) => {
  let rows = db.capacityTasks
  if (req.query.sub_team) rows = rows.filter((t) => t.sub_team === req.query.sub_team)
  if (req.query.gate) rows = rows.filter((t) => t.gate === req.query.gate)
  res.json({ tasks: rows, summary: db.capacitySummary })
})

// ---------------------------------------------------------------- model registry
app.get('/api/model-registry', (req, res) => res.json(db.modelRegistry))
app.get('/api/registry-components', (req, res) => {
  let rows = db.registryComponents
  if (req.query.brand_id) rows = rows.filter((r) => r.brand_id === req.query.brand_id)
  res.json(rows)
})

// ---------------------------------------------------------------- career lattice
app.get('/api/career-lattice', (req, res) => res.json(db.careerLattice))

// ---------------------------------------------------------------- sub-teams / KPI table (D1/D7)
app.get('/api/sub-teams', (req, res) => res.json(db.subTeams))
app.get('/api/kpi-table', (req, res) => res.json(db.kpiTable))
app.get('/api/workforce', (req, res) => res.json(db.workforce))
app.get('/api/employees', (req, res) => {
  let rows = db.employees
  if (req.query.sub_team) rows = rows.filter((e) => e.sub_team === req.query.sub_team)
  res.json(rows)
})

// ---------------------------------------------------------------- override wins
app.get('/api/override-wins', (req, res) => {
  let rows = db.overrideWins
  if (req.query.brand_id) rows = rows.filter((r) => r.brand_id === req.query.brand_id)
  if (req.query.sub_team) rows = rows.filter((r) => r.sub_team === req.query.sub_team)
  res.json(rows)
})

// D2 — Advisor Workspace material edits are logged here as new override wins.
app.post('/api/override-wins', (req, res) => {
  const { employee_name, sub_team, brand_id, ai_suggestion, override_reason, outcome } = req.body
  if (!brand_id || !ai_suggestion || !override_reason) return res.status(400).json({ error: 'brand_id, ai_suggestion and override_reason are required' })
  const entry = {
    id: `ovr_${String(db.overrideWins.length + 1).padStart(3, '0')}`,
    employee_name: employee_name || 'Advisor',
    sub_team: sub_team || 'CRM & Loyalty',
    brand_id, ai_suggestion, override_reason,
    outcome: outcome || 'Sent to client after human styling edit',
    date: new Date().toISOString().slice(0, 10)
  }
  db.overrideWins.unshift(entry)
  res.status(201).json(entry)
})

// ---------------------------------------------------------------- certification history (C3)
app.get('/api/certification-history', (req, res) => {
  let rows = db.certificationHistory
  if (req.query.brand_id) rows = rows.filter((r) => r.brand_id === req.query.brand_id)
  res.json(rows)
})
app.post('/api/certification-history', (req, res) => {
  const { brand_id, draft_excerpt, verdict, reason } = req.body
  const entry = {
    id: `cert_${String(db.certificationHistory.length + 1).padStart(3, '0')}`,
    brand_id, draft_excerpt, verdict, reason,
    date: new Date().toISOString().slice(0, 10)
  }
  db.certificationHistory.unshift(entry)
  res.json(entry)
})

// ---------------------------------------------------------------- signal insights
app.get('/api/signal-insights', (req, res) => {
  let rows = db.signal_insights
  if (req.query.brand_id) rows = rows.filter((r) => r.brand_id === req.query.brand_id)
  res.json(rows)
})
app.post('/api/signal-insights', (req, res) => {
  const { brand_id, insight_text, sent_to } = req.body
  const entry = {
    id: `insight_${String(db.signal_insights.length + 1).padStart(3, '0')}`,
    brand_id, insight_text, sent_to: sent_to || 'Merchandising & Design',
    date: new Date().toISOString().slice(0, 10)
  }
  db.signal_insights.unshift(entry)
  res.json(entry)
})

// ---------------------------------------------------------------- AI Involvement Dial (C13 — audit log)
app.get('/api/dial/:brandId', (req, res) => {
  const settings = getDialSettings(req.params.brandId)
  if (!settings) return res.status(404).json({ error: 'brand not found' })
  const brand = db.brandsById.get(req.params.brandId)
  res.json({ ...settings, ai_tooling_mode: brand.ai_tooling_mode, hard_limit: brand.hard_limit })
})
app.patch('/api/dial/:brandId', (req, res) => {
  const { reason, changed_by, ...patch } = req.body
  const updated = updateDialSettings(req.params.brandId, patch, reason, changed_by)
  if (!updated) return res.status(404).json({ error: 'brand not found' })
  const brand = db.brandsById.get(req.params.brandId)
  res.json({ ...updated, ai_tooling_mode: brand.ai_tooling_mode, hard_limit: brand.hard_limit })
})
app.get('/api/dial-audit-log', (req, res) => {
  let rows = db.dialAuditLog
  if (req.query.brand_id) rows = rows.filter((r) => r.brand_id === req.query.brand_id)
  res.json(rows)
})

// ---------------------------------------------------------------- Gemini (AI call sites)
app.use('/api/gemini', geminiRouter)

// ---------------------------------------------------------------- dashboard KPIs
app.get('/api/dashboard/:brandId', (req, res) => {
  const brand = db.brandsById.get(req.params.brandId)
  if (!brand) return res.status(404).json({ error: 'brand not found' })
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

  res.json({
    brand_id: brand.id,
    customers: brandCustomers.length,
    orders: brandOrders.length,
    open_cases: openCases.length,
    computed_return_rate,
    avg_confidence_score,
    benchmark: {
      nps: brand.nps,
      return_rate_target: brand.return_rate_target,
      monthly_queries: brand.monthly_queries,
      resolution_hrs: brand.resolution_hrs,
      top_query_type: brand.top_query_type
    },
    kpiTable: db.kpiTable
  })
})

// ---------------------------------------------------------------- prod static hosting
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`[server] StyleVerse Confidence Engine API listening on :${PORT}`)
  console.log(`[server] dataset checksum: ${db.meta.checksum?.slice(0, 8)}`)
  runStartupImageHealthCheck().catch((err) => console.error('[imageLibrary] health check failed:', err.message))
})
