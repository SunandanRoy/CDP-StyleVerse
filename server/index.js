import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

import { db, getDialSettings, updateDialSettings } from './data/db.js'
import { computeProductConfidence } from './lib/scoring.js'
import { runStartupImageHealthCheck } from './data/imageLibrary.js'
import geminiRouter from './routes/gemini.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

// ---------------------------------------------------------------- helpers
function paginateOrAll(arr) {
  return arr
}

function customerChannelGroup(c) {
  if (c.channels.length === 2) return 'bridged'
  return c.channels[0] === 'D2C' ? 'd2c_only' : 'marketplace_only'
}

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
app.get('/api/customers', (req, res) => {
  let rows = db.customers
  const { brand_id, channel_type, search, archetype_id } = req.query
  if (brand_id) rows = rows.filter((c) => c.brand_id === brand_id)
  if (channel_type) rows = rows.filter((c) => customerChannelGroup(c) === channel_type)
  if (archetype_id) rows = rows.filter((c) => c.archetype_id === archetype_id)
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q) || (c.loyalty_id || '').toLowerCase().includes(q))
  }
  res.json(rows.map((c) => ({ ...c, channel_group: customerChannelGroup(c) })))
})

app.get('/api/customers/:id', (req, res) => {
  const customer = db.customersById.get(req.params.id)
  if (!customer) return res.status(404).json({ error: 'customer not found' })

  const orders = db.orders.filter((o) => o.customer_id === customer.id)
  const orderIds = new Set(orders.map((o) => o.id))
  const returns = db.returns.filter((r) => orderIds.has(r.order_id))
  const cases = db.cases.filter((c) => c.customer_id === customer.id)

  const timeline = [
    ...orders.map((o) => ({ type: 'order', date: o.date, ref: o })),
    ...returns.map((r) => ({ type: 'return', date: orders.find((o) => o.id === r.order_id)?.date || '', ref: r })),
    ...cases.map((c) => ({ type: 'case', date: c.channel_log[0]?.timestamp?.slice(0, 10) || '', ref: c }))
  ].sort((a, b) => (a.date < b.date ? 1 : -1))

  res.json({
    ...customer,
    channel_group: customerChannelGroup(customer),
    orders,
    returns,
    cases,
    timeline
  })
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

// ---------------------------------------------------------------- orders
app.get('/api/orders', (req, res) => {
  let rows = db.orders
  const { brand_id, channel, status, customer_id } = req.query
  if (customer_id) rows = rows.filter((o) => o.customer_id === customer_id)
  if (channel) rows = rows.filter((o) => o.channel === channel)
  if (status) rows = rows.filter((o) => o.status === status)
  if (brand_id) {
    rows = rows.filter((o) => {
      const c = db.customersById.get(o.customer_id)
      return c && c.brand_id === brand_id
    })
  }
  res.json(
    rows.map((o) => ({
      ...o,
      product_name: db.productsById.get(o.product_id)?.name,
      customer_name: db.customersById.get(o.customer_id)?.name
    }))
  )
})

// ---------------------------------------------------------------- returns
app.get('/api/returns', (req, res) => {
  let rows = db.returns
  const { brand_id, reason_code, intercepted, category } = req.query
  if (reason_code) rows = rows.filter((r) => r.reason_code === reason_code)
  if (intercepted !== undefined) rows = rows.filter((r) => String(r.intercepted) === intercepted)
  if (brand_id) {
    rows = rows.filter((r) => {
      const order = db.ordersById.get(r.order_id)
      const c = order && db.customersById.get(order.customer_id)
      return c && c.brand_id === brand_id
    })
  }
  if (category) {
    rows = rows.filter((r) => {
      const order = db.ordersById.get(r.order_id)
      const product = order && db.productsById.get(order.product_id)
      return product && product.category === category
    })
  }
  res.json(
    rows.map((r) => {
      const order = db.ordersById.get(r.order_id)
      const customer = order && db.customersById.get(order.customer_id)
      const product = order && db.productsById.get(order.product_id)
      return { ...r, order, customer_name: customer?.name, product_name: product?.name, category: product?.category, brand_id: customer?.brand_id }
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

  const isFitDriven = reason_code === 'fit_runs_small' || reason_code === 'fit_runs_large'
  let intercepted = false
  let exchange_offered = false
  let exchange_accepted = false
  let rationale = ''

  if (isFitDriven) {
    intercepted = true
    exchange_offered = true
    const suggestedSize = reason_code === 'fit_runs_small' ? 'one size up' : 'one size down'
    exchange_accepted = brand.ai_tooling_mode !== 'rules_engine_only' // simulated propensity
    rationale = `Fit-driven return detected for ${product?.name}. Interception logic would offer an exchange (${suggestedSize}) using ${customer.name}'s Fit Passport before the return is finalized.`
  } else {
    intercepted = false
    exchange_offered = reason_code === 'change_of_mind'
    rationale = `Reason code "${reason_code}" is not fit-driven, so interception logic would route this straight to standard return processing${exchange_offered ? ', with an optional exchange offer' : ''}.`
  }

  res.json({
    simulated: true,
    customer_id, order_id, reason_code,
    intercepted, exchange_offered, exchange_accepted,
    rationale
  })
})

// ---------------------------------------------------------------- reviews
app.get('/api/reviews', (req, res) => {
  let rows = db.reviews
  const { brand_id, product_id, mentions_fit } = req.query
  if (product_id) rows = rows.filter((r) => r.product_id === product_id)
  if (mentions_fit !== undefined) rows = rows.filter((r) => String(r.mentions_fit) === mentions_fit)
  if (brand_id) {
    rows = rows.filter((r) => db.productsById.get(r.product_id)?.brand_id === brand_id)
  }
  res.json(rows.map((r) => ({ ...r, product_name: db.productsById.get(r.product_id)?.name })))
})

// ---------------------------------------------------------------- cases
app.get('/api/cases', (req, res) => {
  let rows = db.cases
  const { brand_id, status } = req.query
  if (status) rows = rows.filter((c) => c.status === status)
  if (brand_id) rows = rows.filter((c) => db.customersById.get(c.customer_id)?.brand_id === brand_id)
  res.json(rows.map((c) => ({ ...c, customer_name: db.customersById.get(c.customer_id)?.name, brand_id: db.customersById.get(c.customer_id)?.brand_id })))
})

app.get('/api/cases/:id', (req, res) => {
  const kase = db.cases.find((c) => c.id === req.params.id)
  if (!kase) return res.status(404).json({ error: 'case not found' })
  const customer = db.customersById.get(kase.customer_id)
  res.json({ ...kase, customer })
})

// ---------------------------------------------------------------- capacity ledger
app.get('/api/capacity-ledger', (req, res) => {
  let rows = db.capacity_ledger_tasks
  if (req.query.sub_team) rows = rows.filter((t) => t.sub_team === req.query.sub_team)
  if (req.query.gate) rows = rows.filter((t) => t.gate === req.query.gate)
  res.json(rows)
})

// ---------------------------------------------------------------- model registry
app.get('/api/model-registry', (req, res) => res.json(db.model_registry))

// ---------------------------------------------------------------- career lattice
app.get('/api/career-lattice', (req, res) => res.json(db.career_lattice))

// ---------------------------------------------------------------- override wins
app.get('/api/override-wins', (req, res) => {
  let rows = db.override_wins
  if (req.query.brand_id) rows = rows.filter((r) => r.brand_id === req.query.brand_id)
  if (req.query.sub_team) rows = rows.filter((r) => r.sub_team === req.query.sub_team)
  res.json(rows)
})

// ---------------------------------------------------------------- certification history
app.get('/api/certification-history', (req, res) => {
  let rows = db.certification_history
  if (req.query.brand_id) rows = rows.filter((r) => r.brand_id === req.query.brand_id)
  res.json(rows)
})
app.post('/api/certification-history', (req, res) => {
  const { brand_id, draft_excerpt, verdict, reason } = req.body
  const entry = {
    id: `cert_${String(db.certification_history.length + 1).padStart(3, '0')}`,
    brand_id, draft_excerpt, verdict, reason,
    date: new Date().toISOString().slice(0, 10)
  }
  db.certification_history.unshift(entry)
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

// ---------------------------------------------------------------- AI Involvement Dial
app.get('/api/dial/:brandId', (req, res) => {
  const settings = getDialSettings(req.params.brandId)
  if (!settings) return res.status(404).json({ error: 'brand not found' })
  const brand = db.brandsById.get(req.params.brandId)
  res.json({ ...settings, ai_tooling_mode: brand.ai_tooling_mode, hard_limit: brand.hard_limit })
})
app.patch('/api/dial/:brandId', (req, res) => {
  const updated = updateDialSettings(req.params.brandId, req.body)
  if (!updated) return res.status(404).json({ error: 'brand not found' })
  const brand = db.brandsById.get(req.params.brandId)
  res.json({ ...updated, ai_tooling_mode: brand.ai_tooling_mode, hard_limit: brand.hard_limit })
})

// ---------------------------------------------------------------- Gemini (AI call sites)
app.use('/api/gemini', geminiRouter)

// ---------------------------------------------------------------- dashboard KPIs
app.get('/api/dashboard/:brandId', (req, res) => {
  const brand = db.brandsById.get(req.params.brandId)
  if (!brand) return res.status(404).json({ error: 'brand not found' })
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

  res.json({
    brand_id: brand.id,
    customers: brandCustomers.length,
    orders: brandOrders.length,
    open_cases: openCases.length,
    computed_return_rate,
    avg_confidence_score,
    benchmark: {
      nps: brand.nps,
      return_rate: brand.return_rate,
      monthly_queries: brand.monthly_queries,
      resolution_hrs: brand.resolution_hrs,
      top_query_type: brand.top_query_type
    }
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
  runStartupImageHealthCheck().catch((err) => console.error('[imageLibrary] health check failed:', err.message))
})
