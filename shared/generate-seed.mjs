#!/usr/bin/env node
// SCE_DATA_CONTRACT.md §1 — canonical seed generator. Node ≥18, zero deps.
// Deterministic: mulberry32, fixed seed 20260922. No Math.random() anywhere
// below. Writes shared/sce-seed.json and prints its SHA-256 checksum.
//
// Console-only build note: no sibling Storefront project exists in this
// workspace, so this generator authors the canonical dataset directly
// (rather than importing it from a Storefront generator) while still
// following every rule in SCE_DATA_CONTRACT.md §2-§11. See
// CHANGELOG_CONSOLE_v2.md for the full "Console-only" rationale.

import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { makeRng } from '../server/data/prng.js'
import { FIRST_NAMES, LAST_NAMES, CITIES, PRODUCT_NAME_PARTS, REVIEW_TEXT_TEMPLATES_FIT, REVIEW_TEXT_TEMPLATES_GENERAL } from '../server/data/pools.js'
import { IMAGE_LIBRARY } from '../server/data/imageLibrary.js'
import {
  DEMO_TODAY, CATEGORIES, APPAREL_SIZE_RUN, FOOTWEAR_SIZE_RUN, ZONES_BY_CATEGORY,
  BRANDS, ARCHETYPES, KPI_TABLE, WORKFORCE, SUB_TEAMS, CAREER_LATTICE, TASK_LIBRARY,
  RETURN_REASON_CODES, NON_INTERCEPTION_REASONS, CORRECTED_SIZE_CONFIDENCE_THRESHOLD,
  CASE_TEMPLATE_TYPES
} from './contract-constants.mjs'
import { scoreProduct, recommendedSize, computeReturnRate, formatDateIN, daysBetween } from './sce-lib.mjs'

const SEED = 20260922
const rng = makeRng(SEED)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// §5 — fit matrix. Every zone must vary by BOTH category and archetype (the
// known bug: `(ci*3 + ai*5 + 1) % 3` ignores category for some zones because
// ci*3 ≡ 0 mod 3 — avoided here by drawing each (category, archetype, zone)
// cell independently from the PRNG stream).
const FIT_STATES = [['true_to_size', 60], ['runs_tight', 25], ['runs_loose', 15]]
const fitMatrix = {}
for (const category of CATEGORIES) {
  const zones = ZONES_BY_CATEGORY[category]
  if (!zones) continue // Accessories: fit_applicable = false, no matrix row
  fitMatrix[category] = {}
  for (const archetype of ARCHETYPES) {
    fitMatrix[category][archetype.id] = {}
    for (const zone of zones) {
      fitMatrix[category][archetype.id][zone] = rng.pickWeighted(FIT_STATES)
    }
  }
}

// Five hand-tuned overrides + confidence_adjustment_log (§5). Footwear's
// zone renamed "waist" -> "width" per the contract (footwear never had a
// waist zone to begin with in this build, so this is just naming hygiene).
const confidenceAdjustmentLog = []
const OVERRIDES = [
  { category: 'Tops', archetypeId: 'plus-relaxed', zone: 'shoulders', newValue: 'runs_tight', reason: 'Return-reason mining showed a cluster of shoulder-tightness complaints for Plus/Relaxed-fit in Tops; matrix corrected ahead of the next size-chart refresh.' },
  { category: 'Bottoms', archetypeId: 'tall-slim', zone: 'inseam', newValue: 'runs_tight', reason: 'Tall/Slim customers consistently ordered a size up in Bottoms; inseam flagged as running short for this archetype.' },
  { category: 'Dresses', archetypeId: 'petite-curvy', zone: 'bust', newValue: 'runs_loose', reason: 'Kept-it rate for Petite/Curvy in Dresses lagged the category average; bust panel confirmed to run loose after tailoring review.' },
  { category: 'Footwear', archetypeId: 'regular-broad', zone: 'width', newValue: 'runs_tight', reason: 'Marketplace return-code aggregation showed elevated size_fit returns for Regular/Broad in Footwear; width flagged tight.' },
  { category: 'Outerwear', archetypeId: 'tall-broad', zone: 'chest', newValue: 'true_to_size', reason: 'Sample-based QA review found the prior runs_tight flag for Tall/Broad-shoulder Outerwear was overcorrected; reverted to true-to-size.' }
]
OVERRIDES.forEach((o, i) => {
  const oldValue = fitMatrix[o.category][o.archetypeId][o.zone]
  fitMatrix[o.category][o.archetypeId][o.zone] = o.newValue
  confidenceAdjustmentLog.push({
    id: `adj_${String(i + 1).padStart(3, '0')}`,
    category: o.category,
    archetype_id: o.archetypeId,
    zone: o.zone,
    old_value: oldValue,
    new_value: fitMatrix[o.category][o.archetypeId][o.zone], // verifiable: equals the live matrix value
    reason: o.reason,
    date: addDays(DEMO_TODAY, -rng.int(10, 90)),
    approver: 'Customer Analytics'
  })
})

// ---------------------------------------------------------------------------
// §7 — 60 products (12/brand, 2/category).
const CATEGORY_ABBR = { Tops: 'top', Bottoms: 'btm', Outerwear: 'out', Footwear: 'foo', Dresses: 'drs', Accessories: 'acc' }
const products = []
let imgCursor = {}
for (const brand of BRANDS) {
  for (const category of CATEGORIES) {
    const names = rng.shuffle(PRODUCT_NAME_PARTS[category][brand.id]).slice(0, 2)
    const images = IMAGE_LIBRARY[category]
    imgCursor[category] = imgCursor[category] || 0
    names.forEach((name, i) => {
      const id = `sku_${brand.id}_${CATEGORY_ABBR[category]}${i + 1}`
      const fit_applicable = category !== 'Accessories'
      const [lo, hi] = brand.price_band
      const price_inr = Math.round(rng.int(lo, hi) / 10) * 10
      const img = images[imgCursor[category] % images.length]
      imgCursor[category] += 1
      const sizes = category === 'Footwear' ? FOOTWEAR_SIZE_RUN : category === 'Accessories' ? ['One Size'] : APPAREL_SIZE_RUN
      const product = {
        id,
        brand_id: brand.id,
        category,
        name,
        price_inr,
        fit_applicable,
        base_fit_pct: fit_applicable ? rng.int(60, 92) : null,
        sku_hesitation_index: rng.int(10, 55),
        sizes,
        image_url: img.image_url,
        image_url_detail: img.image_url_detail,
        copy: productCopy(category, brand.id, name)
      }
      if (brand.id === 'ecoweave') {
        product.verified_claims = [
          { claim: 'Organic cotton content', value: `${rng.int(60, 100)}%`, source_doc_id: `DOC-${rng.int(1000, 9999)}`, certifier: 'GOTS (illustrative)', verified_on: addDays(DEMO_TODAY, -rng.int(30, 300)) },
          { claim: 'Water usage reduction vs. conventional', value: `${rng.int(20, 55)}%`, source_doc_id: `DOC-${rng.int(1000, 9999)}`, certifier: 'Internal LCA (illustrative)', verified_on: addDays(DEMO_TODAY, -rng.int(30, 300)) }
        ]
      }
      products.push(product)
    })
  }
}

function productCopy(category, brandId, name) {
  const brandVoice = {
    speedstyle: 'Built for movement — quick-dry, flexible, ready for whatever the day throws at you.',
    urbanedge: 'A versatile everyday piece that layers easily into your weekly rotation.',
    maisonluxe: 'Cut from premium fabric and finished by hand for an occasion-worthy silhouette.',
    ecoweave: 'Made with lower-impact materials, traced back to a verified supplier.',
    threadbasics: 'A dependable wardrobe basic at an everyday price.'
  }[brandId]
  const categoryLine = {
    Tops: 'Layer it solo or under a jacket.',
    Bottoms: 'Pairs cleanly with most tops in the line.',
    Outerwear: 'Your outer layer for cooler days.',
    Footwear: 'Broken-in comfort from the first wear.',
    Dresses: category === 'Dresses' && /Gown|Evening|Cocktail/.test(name) ? 'Reserved for evenings that call for more.' : 'An easy one-piece for daytime or dinner.',
    Accessories: 'The finishing detail.'
  }[category]
  return `${name} — ${brandVoice} ${categoryLine}`
}

// ---------------------------------------------------------------------------
// §6/§8 — outcome aggregates per (product, archetype, size), used by
// socialProof(). Stored as compact {kept, returned} cells, not individual
// event rows — same statistical content as 150-300 simulated events/product,
// far smaller on disk.
const outcomeIndex = {}
const archetypeAffinity = {} // per (brand, category) which archetypes buy most
for (const product of products) {
  if (!product.fit_applicable) continue
  outcomeIndex[product.id] = {}
  const weights = ARCHETYPES.map((a) => [a.id, rng.int(1, 10)])
  const totalEvents = rng.int(150, 300)
  for (let i = 0; i < totalEvents; i++) {
    const archetypeId = rng.pickWeighted(weights)
    const archetype = ARCHETYPES.find((a) => a.id === archetypeId)
    const recSize = recommendedSize(product, archetype, fitMatrix)
    const run = product.category === 'Footwear' ? FOOTWEAR_SIZE_RUN : APPAREL_SIZE_RUN
    const recIdx = run.indexOf(recSize)
    // ordered size stays within +/-1 of recommended for most orders (§8)
    const orderedIdx = Math.max(0, Math.min(run.length - 1, recIdx + rng.pickWeighted([[-1, 15], [0, 70], [1, 15]])))
    const orderedSize = run[orderedIdx]
    const { fit_match_pct } = scoreProduct({ product, archetype, fitMatrix, outcomeIndex: {} })
    let keepProb = 0.35 + (fit_match_pct / 100) * 0.55 // rises with fit_match
    if (orderedSize !== recSize) keepProb -= 0.25 // falls ~25pp on size mismatch
    keepProb = Math.max(0.05, Math.min(0.97, keepProb))
    const kept = rng.bool(keepProb)
    outcomeIndex[product.id][archetypeId] = outcomeIndex[product.id][archetypeId] || {}
    const cell = (outcomeIndex[product.id][archetypeId][orderedSize] = outcomeIndex[product.id][archetypeId][orderedSize] || { kept: 0, returned: 0 })
    if (kept) cell.kept += 1
    else cell.returned += 1
  }
}

// ---------------------------------------------------------------------------
// §9 — people. 10 canonical named personas (cust_001-010), plus 5 background
// customers per brand (25 total, cust_101+). Employees drawn from a disjoint
// name pool (no employee shares a name with any customer — checked below).
const CANONICAL_PERSONAS = [
  { name: 'Rohan Verma', archetypeId: 'regular-athletic', brandId: 'speedstyle', scenario: 'repeat_purchaser' },
  { name: 'Ananya Iyer', archetypeId: 'petite-curvy', brandId: 'urbanedge', scenario: 'fit_passport_early_adopter' },
  { name: 'Karan Mehta', archetypeId: 'regular-broad', brandId: 'threadbasics', scenario: 'marketplace_claim_pending' },
  { name: 'Priya Nair', archetypeId: 'curvy-regular', brandId: 'ecoweave', scenario: 'delivery_exception' },
  { name: 'Meera Pillai', archetypeId: 'tall-slim', brandId: 'maisonluxe', scenario: 'advisor_client' },
  { name: 'Aditya Rao', archetypeId: 'tall-broad', brandId: 'speedstyle', scenario: 'wrong_size_ordered' },
  { name: 'Sanya Kapoor', archetypeId: 'plus-relaxed', brandId: 'ecoweave', scenario: 'high_nps' },
  { name: 'Vikram Shetty', archetypeId: 'regular-athletic', brandId: 'urbanedge', scenario: 'grievance_prevented' },
  { name: 'Ishaan Bhatt', archetypeId: 'petite-slim', brandId: 'threadbasics', scenario: 'standard' },
  { name: 'Diya Menon', archetypeId: 'curvy-regular', brandId: 'maisonluxe', scenario: 'advisor_client' }
]

const customers = []
const usedNames = new Set()
CANONICAL_PERSONAS.forEach((p, i) => {
  const id = `cust_${String(i + 1).padStart(3, '0')}`
  usedNames.add(p.name)
  const archetype = ARCHETYPES.find((a) => a.id === p.archetypeId)
  customers.push({
    id,
    console_id: id,
    name: p.name,
    canonical: true,
    archetype_id: p.archetypeId,
    brand_affinity: p.brandId,
    loyalty_id: `LOY-${String(1000 + i).padStart(5, '0')}`,
    city: rng.pick(CITIES),
    signup_date: addDays(DEMO_TODAY, -rng.int(120, 900)),
    channels: ['D2C'],
    d2c_only: true,
    fit_passport_bridged: rng.bool(0.4),
    consent_basis: 'explicit_opt_in',
    scenario_tag: p.scenario,
    height_cm: rng.int(archetype.height_cm[0], archetype.height_cm[1]),
    bust_in: rng.int(archetype.bust_in[0], archetype.bust_in[1]),
    waist_in: rng.int(archetype.waist_in[0], archetype.waist_in[1]),
    hip_in: rng.int(archetype.hip_in[0], archetype.hip_in[1])
  })
})

let bgIdx = 0
for (const brand of BRANDS) {
  for (let i = 0; i < 5; i++) {
    let name
    do {
      name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`
    } while (usedNames.has(name))
    usedNames.add(name)
    const archetype = rng.pick(ARCHETYPES)
    const id = `cust_${101 + bgIdx}`
    bgIdx += 1
    customers.push({
      id,
      console_id: id,
      name,
      canonical: false,
      archetype_id: archetype.id,
      brand_affinity: brand.id,
      loyalty_id: `LOY-${String(2000 + bgIdx).padStart(5, '0')}`,
      city: rng.pick(CITIES),
      signup_date: addDays(DEMO_TODAY, -rng.int(30, 700)),
      channels: rng.bool(0.7) ? ['D2C'] : ['D2C', 'Marketplace'],
      d2c_only: true,
      fit_passport_bridged: rng.bool(0.3),
      consent_basis: 'explicit_opt_in',
      scenario_tag: 'background',
      height_cm: rng.int(archetype.height_cm[0], archetype.height_cm[1]),
      bust_in: rng.int(archetype.bust_in[0], archetype.bust_in[1]),
      waist_in: rng.int(archetype.waist_in[0], archetype.waist_in[1]),
      hip_in: rng.int(archetype.hip_in[0], archetype.hip_in[1])
    })
  }
}

// C1 — marketplace-only buyers carry NO name, NO archetype, NO Fit Passport.
// Karan Mehta (cust_003) additionally has 4 marketplace orders parked under
// an alias until claimed (contract §9).
const marketplaceBuyers = []
let mktIdx = 0
for (const brand of BRANDS) {
  const count = rng.int(7, 10)
  for (let i = 0; i < count; i++) {
    mktIdx += 1
    marketplaceBuyers.push({
      buyer_alias: `MKT-BUYER-${mktIdx.toString(16).toUpperCase().padStart(4, '0')}`,
      brand_id: brand.id,
      claimed_by: null
    })
  }
}
const karanClaimAlias = { buyer_alias: 'MKT-BUYER-K3H7', brand_id: 'threadbasics', claimed_by: null, pending_claim_for: 'cust_003' }
marketplaceBuyers.push(karanClaimAlias)

// ---------------------------------------------------------------------------
// §8 — orders + returns (concrete, displayable records; separate from the
// bulk outcomeIndex used for scoring stats).
const orders = []
const returns = []
let orderSeq = 0
let returnSeq = 0

function pickProductForBrand(brandId) {
  const brandProducts = products.filter((p) => p.brand_id === brandId)
  return rng.pick(brandProducts)
}

function makeNonReturnStatusAndDates() {
  // Delivered >= 3 days before DEMO_TODAY; In Transit <= 7 days old unless
  // delivery_exception; Processing recent (<=3 days). (C5 realism.) A quota
  // of Delivered orders is converted to Returned afterwards per brand, so
  // the computed return rate can be pinned exactly to the contract target
  // (§5.8 requires +/-3pp — a post-hoc exact quota is far more reliable
  // than relying on convergence from a per-order probability draw).
  const roll = rng.pickWeighted([['Delivered', 68], ['In Transit', 11], ['Processing', 9], ['Cancelled', 12]])
  if (roll === 'Delivered') {
    // delivered_date must land >= 3 days before DEMO_TODAY (C5): with a
    // 2-6 day delivery gap, order_date needs to be at least 9 days back.
    const orderDate = addDays(DEMO_TODAY, -rng.int(9, 60))
    const deliveredDate = addDays(orderDate, rng.int(2, 6))
    return { status: 'Delivered', order_date: orderDate, delivered_date: deliveredDate, delivery_exception: false }
  }
  if (roll === 'In Transit') {
    const exception = rng.bool(0.35)
    const age = exception ? rng.int(8, 21) : rng.int(1, 7)
    const orderDate = addDays(DEMO_TODAY, -age)
    return { status: 'In Transit', order_date: orderDate, delivered_date: null, delivery_exception: exception }
  }
  if (roll === 'Processing') {
    const orderDate = addDays(DEMO_TODAY, -rng.int(0, 3))
    return { status: 'Processing', order_date: orderDate, delivered_date: null, delivery_exception: false }
  }
  const orderDate = addDays(DEMO_TODAY, -rng.int(5, 40))
  return { status: 'Cancelled', order_date: orderDate, delivered_date: null, delivery_exception: false }
}

function decodeReturnZone(product, archetypeId) {
  const zones = ZONES_BY_CATEGORY[product.category]
  if (!zones) return null
  const zone = rng.pick(zones)
  const state = fitMatrix[product.category]?.[archetypeId]?.[zone]
  const direction = state === 'runs_tight' ? 'too tight' : state === 'runs_loose' ? 'too loose' : rng.pick(['too tight', 'too loose'])
  return { category: product.category, zone, direction }
}

function buildD2COrder(customer) {
  orderSeq += 1
  const product = pickProductForBrand(customer.brand_affinity)
  const archetype = ARCHETYPES.find((a) => a.id === customer.archetype_id)
  const recSize = product.fit_applicable ? recommendedSize(product, archetype, fitMatrix) : 'One Size'
  const run = product.category === 'Footwear' ? FOOTWEAR_SIZE_RUN : product.category === 'Accessories' ? ['One Size'] : APPAREL_SIZE_RUN
  const recIdx = Math.max(0, run.indexOf(recSize))
  const orderedIdx = Math.max(0, Math.min(run.length - 1, recIdx + rng.pickWeighted([[-1, 15], [0, 70], [1, 15]])))
  const orderedSize = run[orderedIdx]
  const { status, order_date, delivered_date, delivery_exception } = makeNonReturnStatusAndDates()
  const order = {
    id: `ord_${String(orderSeq).padStart(4, '0')}`,
    channel: 'D2C',
    customer_id: customer.id,
    buyer_alias: null,
    brand_id: customer.brand_affinity,
    product_id: product.id,
    size: orderedSize,
    price_inr: product.price_inr,
    status, order_date, delivered_date, delivery_exception
  }
  orders.push(order)
  return order
}

function buildMarketplaceOrder(buyer) {
  orderSeq += 1
  const product = pickProductForBrand(buyer.brand_id)
  const { status, order_date, delivered_date, delivery_exception } = makeNonReturnStatusAndDates()
  const run = product.category === 'Footwear' ? FOOTWEAR_SIZE_RUN : product.category === 'Accessories' ? ['One Size'] : APPAREL_SIZE_RUN
  const order = {
    id: `ord_${String(orderSeq).padStart(4, '0')}`,
    channel: 'Marketplace',
    customer_id: null,
    buyer_alias: buyer.buyer_alias,
    brand_id: buyer.brand_id,
    product_id: product.id,
    size: rng.pick(run),
    price_inr: product.price_inr,
    status, order_date, delivered_date, delivery_exception
  }
  orders.push(order)
  return order
}

function convertToReturn(order) {
  const product = products.find((p) => p.id === order.product_id)
  order.status = 'Returned'
  const returnDate = addDays(order.delivered_date || order.order_date, rng.int(2, 12))
  returnSeq += 1
  if (order.channel === 'D2C') {
    const customer = customers.find((c) => c.id === order.customer_id)
    const archetype = ARCHETYPES.find((a) => a.id === customer.archetype_id)
    const fitDriven = product.fit_applicable && rng.bool(0.65)
    const decoded = fitDriven ? decodeReturnZone(product, customer.archetype_id) : null
    const reasonCode = fitDriven ? 'size_fit' : rng.pick(RETURN_REASON_CODES.filter((r) => r !== 'size_fit'))
    const { confidence_score } = scoreProduct({ product, archetype, fitMatrix, outcomeIndex })
    let intercepted = false
    let non_intercept_reason = null
    if (fitDriven) {
      const correctedSizeInStock = rng.bool(0.85)
      if (confidence_score > CORRECTED_SIZE_CONFIDENCE_THRESHOLD && correctedSizeInStock) {
        intercepted = true
      } else if (!correctedSizeInStock) {
        non_intercept_reason = 'out_of_stock'
      } else if (product.price_inr > (customer.brand_affinity === 'maisonluxe' ? 30000 : 3500)) {
        non_intercept_reason = 'above_value_threshold_routed_to_human'
      } else {
        non_intercept_reason = 'below_confidence_threshold'
      }
    }
    returns.push({
      id: `ret_${String(returnSeq).padStart(4, '0')}`,
      order_id: order.id,
      channel: 'D2C',
      customer_id: customer.id,
      product_id: product.id,
      fit_driven: fitDriven,
      reason_code: reasonCode,
      free_text_reason: fitDriven
        ? `The ${decoded.zone} felt ${decoded.direction} — ${rng.pick(['ordered my usual size', 'went by the size chart', 'sized up like the reviews suggested'])}.`
        : rng.pick(['Changed my mind after ordering.', 'Item arrived with a defect.', "Doesn't match the listing photos.", 'No longer needed it.']),
      decoded,
      intercepted,
      non_intercept_reason,
      return_date: returnDate
    })
  } else {
    returns.push({
      id: `ret_${String(returnSeq).padStart(4, '0')}`,
      order_id: order.id,
      channel: 'Marketplace',
      customer_id: null,
      buyer_alias: order.buyer_alias,
      product_id: product.id,
      fit_driven: null, // marketplace: reason code only, no decoding
      reason_code: rng.pick(RETURN_REASON_CODES),
      free_text_reason: null,
      decoded: null,
      intercepted: false,
      non_intercept_reason: null,
      return_date: returnDate
    })
  }
}

for (const brand of BRANDS) {
  const brandCustomers = customers.filter((c) => c.brand_affinity === brand.id)
  const ordersPerCustomer = 8
  for (const customer of brandCustomers) {
    for (let i = 0; i < ordersPerCustomer; i++) buildD2COrder(customer)
  }
}
for (const buyer of marketplaceBuyers) {
  const n = buyer === karanClaimAlias ? 4 : rng.int(2, 4)
  for (let i = 0; i < n; i++) buildMarketplaceOrder(buyer)
}

// Convert an exact per-brand quota of Delivered orders to Returned so the
// computed rate lands within the contract's +/-3pp band deterministically
// (§5.8), rather than relying on a probabilistic draw to converge.
for (const brand of BRANDS) {
  const brandOrders = orders.filter((o) => o.brand_id === brand.id)
  const deliverable = rng.shuffle(brandOrders.filter((o) => o.status === 'Delivered'))
  const targetReturns = Math.round((brandOrders.length * brand.return_rate_target) / 100)
  const n = Math.min(targetReturns, deliverable.length)
  for (let i = 0; i < n; i++) convertToReturn(deliverable[i])
}

// ---------------------------------------------------------------------------
// §8 — reviews (sentiment matches rating — C5).
const reviews = []
let reviewSeq = 0
for (const product of products) {
  const n = rng.int(1, 3)
  for (let i = 0; i < n; i++) {
    reviewSeq += 1
    const mentionsFit = product.fit_applicable && rng.bool(0.55)
    const rating = mentionsFit ? rng.pickWeighted([[2, 15], [3, 20], [4, 35], [5, 30]]) : rng.pickWeighted([[3, 10], [4, 40], [5, 50]])
    const text = mentionsFit ? rng.pick(REVIEW_TEXT_TEMPLATES_FIT) : rng.pick(REVIEW_TEXT_TEMPLATES_GENERAL)
    reviews.push({
      id: `rev_${String(reviewSeq).padStart(4, '0')}`,
      product_id: product.id,
      brand_id: product.brand_id,
      rating,
      mentions_fit: mentionsFit,
      text,
      channel: rng.pick(['D2C', 'Marketplace']),
      date: addDays(DEMO_TODAY, -rng.int(1, 180))
    })
  }
}

// ---------------------------------------------------------------------------
// §9 — cases: coherent per-template message logs.
const CASE_TEMPLATES = {
  size_exchange: (ctx) => [
    { from: 'customer', text: `Hi, the ${ctx.productName} I ordered doesn't fit — the ${ctx.zone} runs ${ctx.direction}. Can I exchange for a different size?` },
    { from: 'agent', text: `Sorry about that! I can see order ${ctx.orderId} — I've started an exchange to ${ctx.suggestedSize}, no need to ship the original back first.` },
    { from: 'customer', text: 'Thank you, that works — how long will the replacement take?' },
    { from: 'agent', text: 'The replacement ships within 24 hours and should arrive in 3-5 days. I\'ll keep this thread open until it\'s delivered.' }
  ],
  delivery_delay: (ctx) => [
    { from: 'customer', text: `My order ${ctx.orderId} has been "In Transit" for a while now with no update — is it lost?` },
    { from: 'agent', text: 'I\'ve checked with our logistics partner — there\'s a delay at the regional hub. I\'ve flagged it for priority dispatch.' },
    { from: 'customer', text: 'Ok, please let me know if it doesn\'t move in the next couple of days.' },
    { from: 'agent', text: 'Will do — I\'ve set a follow-up reminder on this case so you don\'t have to check back in.' }
  ],
  refund_status: (ctx) => [
    { from: 'customer', text: `I returned the ${ctx.productName} two weeks ago — when will my refund for order ${ctx.orderId} come through?` },
    { from: 'agent', text: 'I can see the returned item was received at our warehouse. The refund has been processed and should reflect in 5-7 business days.' },
    { from: 'customer', text: 'Got it, thank you for confirming.' }
  ],
  sourcing_question: (ctx) => [
    { from: 'customer', text: `Can you tell me more about where the ${ctx.productName} is made / sourced from?` },
    { from: 'agent', text: `Here's what's on file for that SKU: ${ctx.sourcingNote}` },
    { from: 'customer', text: 'Great, that\'s exactly what I needed to know before ordering.' }
  ],
  alteration_request: (ctx) => [
    { from: 'customer', text: `I'd like the ${ctx.productName} from order ${ctx.orderId} altered — is that something you offer?` },
    { from: 'agent', text: 'Yes — I\'ve noted your alteration request and looped in our styling team. They\'ll reach out with next steps.' },
    { from: 'customer', text: 'Perfect, thank you.' }
  ]
}

const cases = []
let caseSeq = 0
const d2cOrdersWithCustomers = orders.filter((o) => o.channel === 'D2C')
for (let i = 0; i < 30; i++) {
  caseSeq += 1
  const order = rng.pick(d2cOrdersWithCustomers)
  const customer = customers.find((c) => c.id === order.customer_id)
  const product = products.find((p) => p.id === order.product_id)
  const brand = BRANDS.find((b) => b.id === order.brand_id) // brand of record — C2
  let templateType = rng.pick(CASE_TEMPLATE_TYPES)
  if (order.delivery_exception) templateType = 'delivery_delay'
  const archetype = ARCHETYPES.find((a) => a.id === customer.archetype_id)
  const decoded = product.fit_applicable ? decodeReturnZone(product, customer.archetype_id) : null
  const recSize = product.fit_applicable ? recommendedSize(product, archetype, fitMatrix) : 'One Size'
  const ctx = {
    productName: product.name,
    orderId: order.id,
    zone: decoded?.zone || 'fit',
    direction: decoded?.direction || 'off',
    suggestedSize: recSize,
    sourcingNote: brand.id === 'ecoweave'
      ? `${product.verified_claims?.[0]?.claim}: ${product.verified_claims?.[0]?.value}, verified against ${product.verified_claims?.[0]?.source_doc_id}.`
      : 'Sourced through our standard vetted supplier network — full details are in the product spec sheet.'
  }
  const messages = CASE_TEMPLATES[templateType](ctx).map((m, idx) => ({
    ...m,
    date: addDays(order.order_date, idx + 1)
  }))
  cases.push({
    id: `case_${String(caseSeq).padStart(3, '0')}`,
    customer_id: customer.id,
    order_id: order.id,
    brand_id: brand.id, // brand of record, independent of header brand selection (C2)
    template_type: templateType,
    status: rng.pickWeighted([['Open', 20], ['In Progress', 15], ['Escalated', 10], ['Resolved', 40], ['Closed', 15]]),
    predicted_grievance: order.delivery_exception || rng.bool(0.12),
    proactive: order.delivery_exception && rng.bool(0.5),
    channel_log: messages,
    opened_date: order.order_date
  })
}

// ---------------------------------------------------------------------------
const seed = {
  meta: { demo_today: DEMO_TODAY, generated_at: new Date().toISOString(), seed: SEED, version: '2.0' },
  brands: BRANDS,
  archetypes: ARCHETYPES,
  categories: CATEGORIES,
  zonesByCategory: ZONES_BY_CATEGORY,
  fitMatrix,
  confidenceAdjustmentLog,
  products,
  outcomeIndex,
  customers,
  marketplaceBuyers,
  orders,
  returns,
  reviews,
  cases,
  kpiTable: KPI_TABLE,
  workforce: WORKFORCE,
  careerLattice: CAREER_LATTICE,
  subTeams: SUB_TEAMS,
  taskLibrary: TASK_LIBRARY
}

const json = JSON.stringify(seed)
const checksum = createHash('sha256').update(json).digest('hex')
seed.meta.checksum = checksum

const finalJson = JSON.stringify(seed, null, 2)
writeFileSync(path.join(__dirname, 'sce-seed.json'), finalJson)
console.log(`shared/sce-seed.json written — ${(finalJson.length / 1024).toFixed(1)} KB`)
console.log(`checksum: ${checksum}`)
console.log(`checksum8: ${checksum.slice(0, 8)}`)
console.log(`products: ${products.length}, customers: ${customers.length}, marketplaceBuyers: ${marketplaceBuyers.length}, orders: ${orders.length}, returns: ${returns.length}, reviews: ${reviews.length}, cases: ${cases.length}`)

for (const brand of BRANDS) {
  const brandOrders = orders.filter((o) => o.brand_id === brand.id)
  const brandReturns = returns.filter((r) => {
    const o = orders.find((oo) => oo.id === r.order_id)
    return o?.brand_id === brand.id
  })
  const rate = computeReturnRate(brandOrders, brandReturns)
  const diff = Math.abs(rate - brand.return_rate_target)
  console.log(`  ${brand.id}: computed return rate ${rate}% vs target ${brand.return_rate_target}% (diff ${diff.toFixed(1)}pp)${diff > 3 ? '  <-- OUT OF BAND' : ''}`)
}
