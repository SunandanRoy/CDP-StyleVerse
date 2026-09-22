#!/usr/bin/env node
// Console-only operational data: employees, capacity ledger, override
// events, brand-voice certification history (produced by the same rubric
// used at runtime — C3), model registry rows, and the Dial audit log
// (C13). Deterministic, seed 20260923, built on top of shared/sce-seed.json.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { makeRng } from '../server/data/prng.js'
import { EMPLOYEE_NAMES, FIRST_NAMES, LAST_NAMES } from '../server/data/pools.js'
import { SUB_TEAMS, TASK_LIBRARY, WORKFORCE, DEMO_TODAY } from '../shared/contract-constants.mjs'
import { certifyVoice } from '../shared/voice-rubric.mjs'

const SEED = 20260923
const rng = makeRng(SEED)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const seed = JSON.parse(readFileSync(path.join(__dirname, '..', 'shared', 'sce-seed.json'), 'utf8'))
const { brands: BRANDS } = seed

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function monthKey(iso) {
  return iso.slice(0, 7)
}

// ---------------------------------------------------------------------------
// §9 — employees. Name pool filtered to avoid any collision with a customer
// name (contract flags "Ananya Iyer" specifically). Named advisors: Meher
// (Maison Luxe) and Aarav (EcoWeave), both in CRM & Loyalty.
const customerNames = new Set(seed.customers.map((c) => c.name))
const employeePool = EMPLOYEE_NAMES.filter((n) => !customerNames.has(n))

const employees = []
let empIdx = 0
function addEmployee(name, subTeam, brandFocus) {
  empIdx += 1
  employees.push({ id: `emp_${String(empIdx).padStart(3, '0')}`, name, sub_team: subTeam, brand_focus: brandFocus })
}
addEmployee('Meher', 'CRM & Loyalty', 'maisonluxe') // named advisor, C9-of-people (renamed from "Priya" to avoid colliding with customer Priya Nair)
addEmployee('Aarav', 'CRM & Loyalty', 'ecoweave') // named advisor
const usedEmployeeNames = new Set(employees.map((e) => e.name))
function nextEmployeeName() {
  for (const n of employeePool) {
    if (!usedEmployeeNames.has(n)) {
      usedEmployeeNames.add(n)
      return n
    }
  }
  let name
  do {
    name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`
  } while (usedEmployeeNames.has(name) || customerNames.has(name))
  usedEmployeeNames.add(name)
  return name
}
for (const subTeam of SUB_TEAMS) {
  const count = subTeam === 'CRM & Loyalty' ? 3 : 4
  for (let i = 0; i < count; i++) {
    addEmployee(nextEmployeeName(), subTeam, null)
  }
}
if (new Set(employees.map((e) => e.name)).size !== employees.length) throw new Error('duplicate employee name')
if (employees.some((e) => customerNames.has(e.name))) throw new Error('employee/customer name collision')

// ---------------------------------------------------------------------------
// C9 — capacity ledger. Monotonic ramp from Month 3, current month partial.
// hrs freed/mo = sum(task.hrs_per_task * monthly_volume); "released to
// date" reconciles against the WORKFORCE.hours_per_month_target.
const PHASE1_START = addDays(DEMO_TODAY, -180) // ~6 months back = "Month 1"
const months = []
for (let m = 0; m < 7; m++) {
  months.push(monthKey(addDays(PHASE1_START, m * 30)))
}
const currentMonthIndex = months.length - 1 // partial

const capacityTasks = TASK_LIBRARY.map((t, i) => {
  const rampShare = [0, 0, 0.15, 0.35, 0.55, 0.78, 1] // Month 1-2 = 0 (pre-launch), ramps from Month 3
  const peakVolume = rng.int(400, 2200)
  const monthlyBreakdown = months.map((mk, mi) => {
    const share = mi === currentMonthIndex ? rampShare[mi] * rng.float() * 0.6 + rampShare[mi] * 0.4 : rampShare[mi]
    const volume = Math.round(peakVolume * share)
    return { month: mk, volume, hrs_freed: Math.round(volume * t.hrs_per_task * 10) / 10 }
  })
  return {
    id: `task_${String(i + 1).padStart(3, '0')}`,
    task: t.task,
    gate: t.gate,
    sub_team: t.sub_team,
    activity: t.activity,
    hrs_per_task: t.hrs_per_task,
    monthly: monthlyBreakdown
  }
})
// "Released to date" is a monthly RUN-RATE (hrs/mo), compared against the
// ~19,040 hrs/mo full-run-rate target — NOT a sum across months (C9: the
// bug being fixed is exactly this kind of total-vs-rate mismatch).
const currentMonthHrs = Math.round(capacityTasks.reduce((sum, t) => sum + (t.monthly[currentMonthIndex]?.hrs_freed || 0), 0) * 10) / 10
const totalHrsFreedToDate = currentMonthHrs
const fteReleasedToDate = Math.round((totalHrsFreedToDate / WORKFORCE.fte_hours_per_month) * 10) / 10

// ---------------------------------------------------------------------------
// C5/C8 — override components, gated by ai_tooling_mode tier so illegal
// suggestion types (e.g. generative styling replies for a rules-engine
// brand) can never appear.
const TIER = { rules_engine_only: 0, retrieval_only: 1, internal_llm_only: 2, full_llm: 3 }
const OVERRIDE_COMPONENTS = [
  { label: 'Auto-approve exchange to one size up', min_tier: 0 },
  { label: 'Auto-close case as resolved', min_tier: 0 },
  { label: 'Send automated size-chart reply', min_tier: 1 },
  { label: 'Auto-refund without return pickup', min_tier: 0 },
  { label: 'Flag customer as high churn-risk', min_tier: 0 },
  { label: 'Route case to Tier 1 queue', min_tier: 0 },
  { label: 'Suggest generative styling reply', min_tier: 3 },
  { label: 'Auto-intercept return with exchange offer', min_tier: 0 },
  { label: 'Draft internal advisor brief', min_tier: 2 }
]
const OVERRIDE_REASONS = [
  "Customer's order history showed a pattern the model didn't weigh heavily enough.",
  'Brand hard limit required human sign-off before this action could go out.',
  "Recent size-chart update wasn't yet reflected in the model's training data.",
  'Case context (VIP customer) warranted a more personal resolution than the suggestion.',
  'Model suggestion conflicted with a currently active promotional exception.',
  'Customer had already tried the suggested fix per the channel log.'
]
const OVERRIDE_OUTCOMES = [
  'Customer retained, repeat purchase within 30 days', 'Return avoided, exchange accepted', 'NPS follow-up score of 9/10',
  'Case resolved in one touch instead of three', 'Escalation avoided entirely', 'Customer upgraded to loyalty tier'
]

const AUTOMATION_BIAS_WATCH = { brandId: 'speedstyle', componentLabel: 'Auto-close case as resolved' }

const registryComponents = []
const overrideWins = []
let overrideWinSeq = 0
for (const brand of BRANDS) {
  const tier = TIER[brand.ai_tooling_mode]
  const legal = OVERRIDE_COMPONENTS.filter((c) => tier >= c.min_tier)
  for (const comp of legal) {
    const isWatchCase = brand.id === AUTOMATION_BIAS_WATCH.brandId && comp.label === AUTOMATION_BIAS_WATCH.componentLabel
    const suggestions = rng.int(30, 90)
    const rate = isWatchCase ? rng.float() * 0.06 + 0.06 : rng.float() * 0.15 + 0.15 // watch case: 6-12%; else 15-30%
    const overrides = Math.max(1, Math.round(suggestions * rate))
    registryComponents.push({
      id: `reg_${brand.id}_${comp.label.replace(/\W+/g, '_').toLowerCase()}`,
      brand_id: brand.id,
      component: comp.label,
      ai_suggestions: suggestions,
      overrides,
      override_rate: Math.round((overrides / suggestions) * 1000) / 10,
      automation_bias_watch: isWatchCase
    })
    const sampleCount = Math.min(overrides, rng.int(1, 3))
    for (let i = 0; i < sampleCount; i++) {
      overrideWinSeq += 1
      const emp = rng.pick(employees.filter((e) => e.sub_team !== 'Customer Journey & Experience Design'))
      overrideWins.push({
        id: `ovr_${String(overrideWinSeq).padStart(3, '0')}`,
        employee_name: emp.name,
        sub_team: emp.sub_team,
        brand_id: brand.id,
        ai_suggestion: comp.label,
        override_reason: rng.pick(OVERRIDE_REASONS),
        outcome: rng.pick(OVERRIDE_OUTCOMES),
        date: addDays(DEMO_TODAY, -rng.int(1, 150))
      })
    }
  }
}

// ---------------------------------------------------------------------------
// C3 — certification history produced by the deterministic rubric (not a
// canned "always Pass"). First-pass rate trends upward toward Month 9.
const CERT_DRAFTS = {
  compliant: {
    speedstyle: 'Thanks for the heads up — I\'ve got your exchange started for the next size up, no need to send anything back first.',
    urbanedge: 'Appreciate you flagging this. I\'ve escalated the delivery delay and you\'ll get a status update within 24 hours.',
    maisonluxe: 'Thank you for your patience while we reviewed your fit notes — the alteration has been arranged. — Meher, Your Styling Advisor',
    ecoweave: 'Here is the sourcing detail on file: organic cotton content verified against DOC-4821.',
    threadbasics: 'Thanks for reaching out. Your refund has been processed and will reflect within 5-7 business days.'
  },
  noncompliant: {
    speedstyle: 'lol yeah that sizing chart is kind of a mess 😅 sorry sorry sorry',
    urbanedge: 'omg limited time offer, act now!! 🎉🎉🎉',
    maisonluxe: 'hey! sorted it for u 😊 hurry before it sells out!',
    ecoweave: 'yeah its sustainable trust me',
    threadbasics: 'yo whats up with ur order lol'
  }
}
const certificationHistory = []
let certSeq = 0
for (const brand of BRANDS) {
  const brandObj = BRANDS.find((b) => b.id === brand.id)
  const total = rng.int(8, 14)
  for (let i = 0; i < total; i++) {
    certSeq += 1
    const monthsAgo = rng.int(0, 9)
    // pass-rate improves as monthsAgo decreases (i.e. trends up toward Month 9/"now")
    const passProb = Math.min(0.93, 0.55 + (9 - monthsAgo) * 0.045)
    const useCompliant = rng.bool(passProb)
    const draftPool = useCompliant ? CERT_DRAFTS.compliant : CERT_DRAFTS.noncompliant
    const draft = draftPool[brand.id]
    const { verdict, reason } = certifyVoice(draft, brandObj)
    certificationHistory.push({
      id: `cert_${String(certSeq).padStart(3, '0')}`,
      brand_id: brand.id,
      draft_excerpt: draft.slice(0, 140),
      verdict,
      reason,
      date: addDays(DEMO_TODAY, -monthsAgo * 30 - rng.int(0, 25))
    })
  }
}
certificationHistory.sort((a, b) => (a.date < b.date ? 1 : -1))

// ---------------------------------------------------------------------------
// Model Registry rows — one per distinct AI/decision component actually
// used in the app, aggregating override_rate from registryComponents where
// applicable.
function avgOverrideRateFor(componentLabel) {
  const rows = registryComponents.filter((r) => r.component === componentLabel)
  if (!rows.length) return null
  const totalSug = rows.reduce((s, r) => s + r.ai_suggestions, 0)
  const totalOvr = rows.reduce((s, r) => s + r.overrides, 0)
  return Math.round((totalOvr / totalSug) * 1000) / 10
}
const modelRegistry = [
  { id: 'model_confidence', name: 'Confidence Score Model', version: 'v2.3', status: 'Production', owner: 'Customer Analytics', last_validated: addDays(DEMO_TODAY, -18), override_rate: null, notes: 'Deterministic formula (§6), not a trained model — validation = formula unit tests + calibration chart (D6).' },
  { id: 'model_archetype', name: 'Archetype Assignment (nearest-centroid)', version: 'v1.4-prototype', status: 'Prototype', owner: 'Customer Analytics', last_validated: addDays(DEMO_TODAY, -18), override_rate: null, notes: 'Nearest-centroid over (height, bust, waist, hip, usual size) in the prototype; production = K-means/GMM (solution doc §7.3).' },
  { id: 'model_interception', name: 'Return Interception Decision Engine', version: 'v1.1', status: 'Production', owner: 'Customer Analytics', last_validated: addDays(DEMO_TODAY, -30), override_rate: avgOverrideRateFor('Auto-intercept return with exchange offer'), notes: 'Rules engine on top of the confidence score + stock check (§ Module 4 decision logic).' },
  { id: 'model_case_triage', name: 'Case Auto-Close Classifier', version: 'v1.0', status: 'Production', owner: 'Digital Customer Support', last_validated: addDays(DEMO_TODAY, -25), override_rate: avgOverrideRateFor('Auto-close case as resolved'), notes: 'Flags automation-bias watch on SpeedStyle — see Override Wins.' },
  { id: 'model_voice_rubric', name: 'Brand Voice Certification Rubric', version: 'v2.0', status: 'Production', owner: 'Customer Journey & Experience Design', last_validated: addDays(DEMO_TODAY, -5), override_rate: null, notes: 'Deterministic rubric (banned markers, emoji policy, apology count, length bounds, brand-specific rules) — guards every live Gemini call too.' },
  { id: 'model_grievance', name: 'Grievance Radar Risk Score', version: 'v1.0-prototype', status: 'Prototype', owner: 'Digital Customer Support', last_validated: addDays(DEMO_TODAY, -12), override_rate: null, notes: 'Rule + z-score on delivery delay; sensitivity bound to the AI Involvement Dial proactivity threshold.' },
  { id: 'model_signal', name: 'Marketplace Signal Miner', version: 'v1.2', status: 'Production', owner: 'Marketplace Operations', last_validated: addDays(DEMO_TODAY, -40), override_rate: null, notes: 'SKU-level aggregate only — no individual marketplace buyer identity (data boundary, D5).' }
]

// ---------------------------------------------------------------------------
// C13 — Dial audit log: every historical change with a reason.
const DIAL_FIELDS = ['automation_frequency', 'proactivity_threshold', 'escalation_threshold', 'tone', 'disclosure_mode']
const DIAL_REASONS = [
  'Quarterly Risk & Ethics Board review — adjusted per Q3 findings.',
  'NPS dip traced to over-eager proactive outreach; threshold raised.',
  'Post-launch calibration after the first two weeks of live traffic.',
  'Brand hard-limit compliance check ahead of the marketplace expansion.',
  'Customer Journey & Experience Design requested a tone refresh.'
]
const dialAuditLog = []
let dialLogSeq = 0
for (const brand of BRANDS) {
  const changeCount = rng.int(3, 6)
  for (let i = 0; i < changeCount; i++) {
    dialLogSeq += 1
    const field = rng.pick(DIAL_FIELDS)
    const before = field === 'tone' ? 'Professional' : field === 'disclosure_mode' ? brand.disclosure_mode : rng.int(30, 90)
    const after = field === 'tone' ? rng.pick(['Energetic', 'Warm & Honest', 'Professional', 'Straightforward']) : field === 'disclosure_mode' ? brand.disclosure_mode : rng.int(30, 90)
    dialAuditLog.push({
      id: `dial_log_${String(dialLogSeq).padStart(3, '0')}`,
      brand_id: brand.id,
      parameter: field,
      before,
      after,
      reason: rng.pick(DIAL_REASONS),
      changed_by: rng.pick(employees.filter((e) => e.sub_team === 'Customer Journey & Experience Design')).name,
      date: addDays(DEMO_TODAY, -rng.int(5, 240))
    })
  }
}
dialAuditLog.sort((a, b) => (a.date < b.date ? 1 : -1))

// ---------------------------------------------------------------------------
const extension = {
  meta: { seed: SEED, generated_at: new Date().toISOString(), version: '2.0-extension', based_on_checksum: seed.meta.checksum },
  employees,
  capacityTasks,
  capacitySummary: {
    months,
    current_month_index: currentMonthIndex,
    total_hrs_freed_to_date: totalHrsFreedToDate,
    current_month_hrs: currentMonthHrs,
    fte_released_to_date: fteReleasedToDate,
    fte_target: WORKFORCE.fte_equivalents_target,
    hours_target: WORKFORCE.hours_per_month_target
  },
  registryComponents,
  overrideWins,
  certificationHistory,
  modelRegistry,
  dialAuditLog
}

const json = JSON.stringify(extension, null, 2)
writeFileSync(path.join(__dirname, '..', 'shared', 'console-extension.json'), json)
const checksum = createHash('sha256').update(JSON.stringify(extension)).digest('hex')
console.log(`shared/console-extension.json written — ${(json.length / 1024).toFixed(1)} KB`)
console.log(`checksum8: ${checksum.slice(0, 8)}`)
console.log(`employees: ${employees.length}, capacityTasks: ${capacityTasks.length}, overrideWins: ${overrideWins.length}, certHistory: ${certificationHistory.length}, dialAuditLog: ${dialAuditLog.length}`)
console.log(`capacity: ${totalHrsFreedToDate} hrs/mo to date (~${fteReleasedToDate} FTE of ${WORKFORCE.fte_equivalents_target} target)`)
console.log('automation-bias watch component:', registryComponents.find((r) => r.automation_bias_watch))
const outOfBandCount = registryComponents.filter((r) => !r.automation_bias_watch && (r.override_rate < 15 || r.override_rate > 30)).length
console.log(`components outside 15-30% band (excluding the deliberate watch case): ${outOfBandCount}`)
