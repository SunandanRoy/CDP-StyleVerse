import express from 'express'
import { db, getDialSettings } from '../data/db.js'
import { computeProductConfidence } from '../lib/scoring.js'
import { certifyVoice } from '../../shared/voice-rubric.mjs'

const router = express.Router()

const GEMINI_MODEL = 'gemini-2.5-flash' // verify this ID is still current in Google AI Studio before a live demo
const TIMEOUT_MS = 8000
const RATE_LIMIT_PER_MINUTE = 8

// ---- server-start API-key check ----
export const apiAvailable = Boolean(process.env.GEMINI_API_KEY)
if (!apiAvailable) {
  console.warn('[gemini] GEMINI_API_KEY not set — all 4 AI call sites will run on canned/rules fallbacks only.')
} else {
  console.log('[gemini] GEMINI_API_KEY detected — live Gemini calls enabled (with fallback on any failure).')
}

// ---- rolling 60s call counter, pre-emptive fallback above the cap ----
const callTimestamps = []
function withinRateLimit() {
  const now = Date.now()
  while (callTimestamps.length && now - callTimestamps[0] > 60000) callTimestamps.shift()
  return callTimestamps.length < RATE_LIMIT_PER_MINUTE
}
function recordCall() {
  callTimestamps.push(Date.now())
}

async function callGemini(prompt) {
  if (!apiAvailable) return { success: false, reason: 'unavailable' }
  if (!withinRateLimit()) return { success: false, reason: 'rate_limited' }
  recordCall()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    clearTimeout(timer)
    if (res.status === 429) return { success: false, reason: 'rate_limited' }
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[gemini] HTTP ${res.status} error:`, detail.slice(0, 500))
      return { success: false, reason: 'error' }
    }
    const json = await res.json()
    const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim()
    if (!text) {
      console.error('[gemini] Empty response body:', JSON.stringify(json).slice(0, 500))
      return { success: false, reason: 'error' }
    }
    return { success: true, text }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') return { success: false, reason: 'timeout' }
    console.error('[gemini] Network/parse error:', err.message)
    return { success: false, reason: 'error' }
  }
}

// ---- canned fallbacks, one per function ----
const FALLBACKS = {
  explainScore: 'This score reflects a strong fit-match with your archetype and positive feedback from shoppers with a similar profile.',
  draftOutreach: 'Hi [name], we noticed a possible delay with your recent order and wanted to reach out before you had to ask. We\'re on it — here\'s what happens next.',
  certifyVoice: 'VERDICT: Pass\nREASON: Tone is warm and on-brand, no policy concerns.',
  generateSignalInsight: 'Multiple reviews mention fit running small in this category — consider flagging for a sizing review with Merchandising.',
  advisorBrief: 'BRIEF: Client profile and recent order history reviewed — no unusual fit signals.\nMESSAGE: Hi there, we picked out a few pieces we think you\'ll love based on your recent orders — want us to set them aside for you?'
}

function fallbackResponse(fn, note) {
  return { success: true, text: FALLBACKS[fn], example: true, mode: 'fallback', note }
}

// ---- brand-routed dispatch: ai_tooling_mode is the single source of truth ----
async function routedCall({ fn, brand, prompt, ruleBasedTemplate, retrievalSource }) {
  const mode = brand.ai_tooling_mode

  if (mode === 'rules_engine_only') {
    return { success: true, text: ruleBasedTemplate(), example: false, mode: 'rules_engine', label: 'Rules-engine generated — no LLM used for this brand.' }
  }

  if (mode === 'retrieval_only') {
    if (!retrievalSource) {
      // No clean retrieval source for this function on this brand — rules-based template instead of Gemini.
      return { success: true, text: ruleBasedTemplate(), example: false, mode: 'rules_engine', label: 'Retrieval-grounded template — no generative fallback available for this function.' }
    }
    const constrainedPrompt = `Using ONLY the following verified text, summarize without adding any claim not present in it: ${retrievalSource}`
    const result = await callGemini(constrainedPrompt)
    if (!result.success) return { ...fallbackResponse(fn, `Gemini ${result.reason}`), label: 'Retrieval-grounded — no generative fallback.' }
    return { success: true, text: result.text, example: false, mode: 'retrieval', label: 'Retrieval-grounded — no generative fallback.' }
  }

  // full_llm and internal_llm_only both call Gemini normally
  const result = await callGemini(prompt)
  if (!result.success) return { ...fallbackResponse(fn, `Gemini ${result.reason}`), label: mode === 'internal_llm_only' ? 'Draft only — requires human sign-off before sending' : undefined }
  return {
    success: true,
    text: result.text,
    example: false,
    mode: mode === 'internal_llm_only' ? 'internal_llm' : 'full_llm',
    label: mode === 'internal_llm_only' ? 'Draft only — requires human sign-off before sending' : undefined
  }
}

router.get('/status', (req, res) => {
  res.json({ apiAvailable, model: GEMINI_MODEL, callsInLastMinute: callTimestamps.length, rateLimitPerMinute: RATE_LIMIT_PER_MINUTE })
})

// 1) explainScore(product, signals)
router.post('/explain-score', async (req, res) => {
  const { productId, archetypeId } = req.body
  const product = db.productsById.get(productId)
  const brand = db.brandsById.get(product?.brand_id)
  if (!product || !brand) return res.status(404).json({ success: false, reason: 'error' })
  const signals = computeProductConfidence(product, archetypeId, db)

  const prompt = `Given confidence signals — fit-match: ${signals.fit_match_pct}%, social-proof kept-it rate: ${signals.social_proof_kept_it_rate}%, hesitation flag: ${signals.hesitation_penalty} — write ONE short sentence (under 25 words) explaining why the confidence score is ${signals.confidence_score}%, styled as a helpful in-app note. No technical model terms.`

  const ruleBasedTemplate = () =>
    `This ${signals.confidence_score}% confidence reflects a ${signals.fit_match_pct}% fit-match for your body profile and a ${signals.social_proof_kept_it_rate}% keep rate among similar shoppers.`

  const out = await routedCall({ fn: 'explainScore', brand, prompt, ruleBasedTemplate })
  res.json({ ...out, signals })
})

// 2) draftOutreach(customer, caseContext)
router.post('/draft-outreach', async (req, res) => {
  const { caseId } = req.body
  const kase = db.cases.find((c) => c.id === caseId)
  const customer = db.customersById.get(kase?.customer_id)
  const brand = db.brandsById.get(kase?.brand_id) // C2 — brand of record, not header selection
  if (!kase || !customer || !brand) return res.status(404).json({ success: false, reason: 'error' })

  const recentOrder = db.orders.filter((o) => o.customer_id === customer.id).sort((a, b) => (a.order_date < b.order_date ? 1 : -1))[0]
  const orderContext = recentOrder ? `order ${recentOrder.id} (${recentOrder.status}, placed ${recentOrder.order_date}, channel ${recentOrder.channel})` : 'their recent activity'

  const prompt = `Given case context [${orderContext}], draft a short warm proactive outreach message (2-3 sentences) sent BEFORE the customer complains, acknowledging a likely issue and offering a fix. Brand-appropriate tone for ${brand.name}, not overly apologetic.`

  const ruleBasedTemplate = () =>
    `Hi ${customer.name.split(' ')[0]}, we noticed ${recentOrder ? `order ${recentOrder.id} is currently "${recentOrder.status}"` : 'a possible delay with your recent order'} and wanted to reach out before you had to ask. We're on it — here's what happens next.`

  const retrievalSource = null // draftOutreach has no clean retrieval source — EcoWeave uses the rules-based template

  const out = await routedCall({ fn: 'draftOutreach', brand, prompt, ruleBasedTemplate, retrievalSource })
  res.json({ ...out, customer_name: customer.name })
})

// 3) certifyVoice(draftText, brandTone)
router.post('/certify-voice', async (req, res) => {
  const { draftText, brandId } = req.body
  const brand = db.brandsById.get(brandId)
  if (!brand || !draftText) return res.status(400).json({ success: false, reason: 'error' })
  const dial = getDialSettings(brandId)
  const brandTone = dial?.tone || brand.posture

  const prompt = `Score this draft reply against a '${brandTone}' brand voice, pass/fail. Reply: '${draftText}'. Respond exactly as: 'VERDICT: Pass/Fail\\nREASON: [one sentence]'`

  // C3 — the deterministic rubric is the guard, not just the offline fallback:
  // even a live Gemini "Pass" gets overridden if the rubric would fail it, so
  // a model can never certify something the brand's hard rules prohibit.
  const ruleBasedTemplate = () => {
    const { verdict, reason } = certifyVoice(draftText, brand)
    return `VERDICT: ${verdict}\nREASON: ${reason}`
  }

  const retrievalSource = `Brand tone guide for ${brand.name}: "${brandTone}". Hard limit: "${brand.hard_limit}". Draft under review: "${draftText}"`

  const out = await routedCall({ fn: 'certifyVoice', brand, prompt, ruleBasedTemplate, retrievalSource })
  const rubric = certifyVoice(draftText, brand)
  if (rubric.verdict === 'Fail' && /VERDICT:\s*Pass/i.test(out.text || '')) {
    out.text = `VERDICT: Fail\nREASON: ${rubric.reason}`
    out.rubric_overrode_model = true
  }
  res.json(out)
})

// 4) generateSignalInsight(reviewsBatch)
router.post('/signal-insight', async (req, res) => {
  const { brandId, productId } = req.body
  const brand = db.brandsById.get(brandId)
  if (!brand) return res.status(404).json({ success: false, reason: 'error' })

  let batch = db.reviews.filter((r) => r.mentions_fit)
  if (productId) batch = batch.filter((r) => r.product_id === productId)
  batch = batch.filter((r) => {
    const p = db.productsById.get(r.product_id)
    return p && p.brand_id === brandId
  })
  if (batch.length === 0) batch = db.reviews.filter((r) => r.mentions_fit).slice(0, 8)
  const sample = batch.slice(0, 10).map((r) => r.text)

  const prompt = `Given these reviews: ${JSON.stringify(sample)}, identify the single most actionable fit/sizing pattern and write a one-sentence recommendation for Merchandising/Design.`

  const ruleBasedTemplate = () => {
    const smallCount = batch.filter((r) => /small|tight/i.test(r.text)).length
    const largeCount = batch.filter((r) => /large|loose/i.test(r.text)).length
    const pattern = smallCount >= largeCount ? 'running small' : 'running large'
    return `${batch.length} fit-related reviews analyzed; the dominant pattern is sizing ${pattern} — recommend a size-chart review with Merchandising for the affected category.`
  }

  const retrievalSource = sample.length ? `Verified customer reviews (mentions_fit=true): ${JSON.stringify(sample)}` : null

  const out = await routedCall({ fn: 'generateSignalInsight', brand, prompt, ruleBasedTemplate, retrievalSource })
  res.json({ ...out, sample_size: batch.length })
})

// 5) advisorBrief(customer, suggestedLooks) — D2 Advisor Workspace. Never
// sent to the client as-is: internal_llm_only/retrieval_only brands treat
// this as a draft an advisor must edit and certify before it goes out.
router.post('/advisor-brief', async (req, res) => {
  const { customerId, brandId, productIds = [] } = req.body
  const customer = db.customersById.get(customerId)
  const brand = db.brandsById.get(brandId)
  if (!customer || !brand) return res.status(404).json({ success: false, reason: 'error' })
  const archetype = db.archetypesById.get(customer.archetype_id)
  const looks = productIds.map((id) => db.productsById.get(id)).filter(Boolean)
  const looksSummary = looks.length ? looks.map((p) => p.name).join(', ') : 'a few pieces from this season'
  const recentOrders = db.orders.filter((o) => o.customer_id === customerId).sort((a, b) => (a.order_date < b.order_date ? 1 : -1)).slice(0, 3)
  const firstName = customer.name.split(' ')[0]

  const prompt = `Client profile: ${archetype?.label || 'unknown archetype'}, ${customer.fit_passport_bridged ? 'Fit Passport bridged from D2C sizing history' : 'no Fit Passport on file'}, recent orders: ${recentOrders.map((o) => o.product_id).join(', ') || 'none'}. Suggested looks: ${looksSummary}. Write EXACTLY two lines:\nBRIEF: a 1-2 sentence internal styling note for the advisor's eyes only (may reference data directly).\nMESSAGE: a 1-2 sentence warm client-facing message recommending the suggested looks, in ${brand.name}'s tone. No invented facts.`

  const ruleBasedTemplate = () =>
    `BRIEF: ${firstName} is a ${archetype?.label || 'profile not on file'}; ${customer.fit_passport_bridged ? 'Fit Passport is bridged from prior D2C orders' : 'no Fit Passport on file yet'}; recent orders: ${recentOrders.length || 'none'}.\nMESSAGE: Hi ${firstName}, based on your recent picks we think you'll love ${looksSummary} — want us to set them aside for you?`

  const retrievalSource = looks.length
    ? `Verified product data: ${looks.map((p) => `${p.name} (${p.category}, ${p.verified_claims?.[0]?.claim || 'no additional claims'})`).join('; ')}`
    : null

  const out = await routedCall({ fn: 'advisorBrief', brand, prompt, ruleBasedTemplate, retrievalSource })
  const [briefLine, messageLine] = (out.text || '').split(/\n+/).filter(Boolean)
  res.json({
    ...out,
    brief: briefLine?.replace(/^BRIEF:\s*/i, '').trim() || out.text,
    message: messageLine?.replace(/^MESSAGE:\s*/i, '').trim() || ruleBasedTemplate().split('\n')[1].replace(/^MESSAGE:\s*/i, '')
  })
})

export default router
