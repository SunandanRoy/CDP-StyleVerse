#!/usr/bin/env node
// SCE Shared Data Spine — canonical generator (SCE_DATA_CONTRACT.md v2.0)
// Node >=18, zero dependencies. Deterministic: mulberry32, fixed seed 20260922.
// Writes shared/sce-seed.json and prints its SHA-256 checksum.
//
// This file is consumed two ways:
//  1. Run directly with `node shared/generate-seed.mjs` to (re)produce the JSON.
//  2. scripts/inline-seed.mjs extracts the source text between the
//     PURE HELPERS START/END markers below and pastes it verbatim into
//     PWC_CX_Semi.html (and, later, PWC_CDP_Semi.html) so both tools run the
//     exact same scoring/date logic client-side with no runtime fetch.
//     Everything inside that block must be plain function/const declarations —
//     no `import`/`export`, no reference to Node-only globals.

import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MASTER_SEED = 20260922;
const DEMO_TODAY = "2026-09-25";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return h;
}
function rngFor(...parts) {
  return mulberry32((hashStr(parts.join('::')) ^ MASTER_SEED) >>> 0);
}
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function pickWeighted(rng, entries) {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = rng() * total;
  for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
  return entries[entries.length - 1][0];
}
function randInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
function clampNum(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/* === PURE HELPERS START === */
// (verbatim-inlined into PWC_CX_Semi.html by scripts/inline-seed.mjs)
const CATEGORIES = ["Tops", "Bottoms", "Outerwear", "Footwear", "Dresses", "Accessories"];
const ZONES_BY_CATEGORY = {
  Tops: ["shoulders", "chest", "length"],
  Outerwear: ["shoulders", "chest", "length"],
  Bottoms: ["waist", "hip", "inseam"],
  Dresses: ["bust", "waist", "length"],
  Footwear: ["length", "width"],
  Accessories: []
};
const DOMINANT_ZONE_BY_CATEGORY = {
  Tops: "shoulders", Outerwear: "shoulders", Bottoms: "waist",
  Dresses: "bust", Footwear: "length", Accessories: null
};
const APPAREL_SIZE_RUN = ["XS", "S", "M", "L", "XL", "XXL"];
const FOOTWEAR_SIZE_RUN = ["4", "5", "6", "7", "8", "9", "10", "11"];

function sizeRunFor(product) {
  if (!product.fit_applicable) return ["One Size"];
  return product.category === "Footwear" ? FOOTWEAR_SIZE_RUN : APPAREL_SIZE_RUN;
}
function clampScore(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function offZoneCount(category, archetypeId, fitMatrix) {
  const zones = ZONES_BY_CATEGORY[category] || [];
  const cell = fitMatrix[category] && fitMatrix[category][archetypeId];
  if (!cell) return 0;
  let n = 0;
  zones.forEach(z => { if (cell[z] && cell[z] !== "true_to_size") n++; });
  return n;
}
function computeFitMatchPct(product, archetypeId, fitMatrix) {
  if (!product.fit_applicable) return null;
  if (!archetypeId) return clampScore(product.base_fit_pct - 10, 0, 100);
  const off = offZoneCount(product.category, archetypeId, fitMatrix);
  return clampScore(product.base_fit_pct - 7 * off, 0, 100);
}
// fitFeedback: { [archetypeId]: { [size]: { kept:N, returned:N } } }
function socialProof(product, archetypeId, sizeId) {
  const fb = product.fitFeedback || {};
  function sumSizes(archId, onlySize) {
    const bySize = fb[archId]; if (!bySize) return { kept: 0, returned: 0 };
    let kept = 0, returned = 0;
    Object.keys(bySize).forEach(sz => {
      if (onlySize && sz !== onlySize) return;
      kept += bySize[sz].kept; returned += bySize[sz].returned;
    });
    return { kept, returned };
  }
  function sumAll() {
    let kept = 0, returned = 0;
    Object.keys(fb).forEach(archId => {
      const r = sumSizes(archId, null); kept += r.kept; returned += r.returned;
    });
    return { kept, returned };
  }
  if (archetypeId && sizeId) {
    const r = sumSizes(archetypeId, sizeId);
    const n = r.kept + r.returned;
    if (n >= 20) return { rate: Math.round((r.kept / n) * 100), n, level: "size" };
  }
  if (archetypeId) {
    const r = sumSizes(archetypeId, null);
    const n = r.kept + r.returned;
    if (n >= 20) return { rate: Math.round((r.kept / n) * 100), n, level: "archetype" };
  }
  const r = sumAll();
  const n = r.kept + r.returned;
  if (n === 0) return { rate: 75, n: 0, level: "product" };
  return { rate: Math.round((r.kept / n) * 100), n, level: "product" };
}
function recommendedSize(product, archetypeId, fitMatrix, archetypesById) {
  if (!product.fit_applicable) return "One Size";
  if (!archetypeId) return null;
  const arch = archetypesById[archetypeId];
  if (!arch) return null;
  const run = sizeRunFor(product);
  const base = product.category === "Footwear" ? String(arch.base_footwear_uk) : arch.base_apparel_size;
  let idx = run.indexOf(base);
  if (idx === -1) idx = Math.floor(run.length / 2);
  const dom = DOMINANT_ZONE_BY_CATEGORY[product.category];
  const cell = fitMatrix[product.category] && fitMatrix[product.category][archetypeId];
  const dir = (cell && dom) ? cell[dom] : "true_to_size";
  if (dir === "runs_tight") idx += 1;
  if (dir === "runs_loose") idx -= 1;
  idx = clampScore(idx, 0, run.length - 1);
  return run[idx];
}
function scoreProduct(product, archetypeId, fitMatrix, archetypesById) {
  if (!product.fit_applicable) return null;
  const fitMatchPct = computeFitMatchPct(product, archetypeId, fitMatrix);
  const recSize = recommendedSize(product, archetypeId, fitMatrix, archetypesById);
  const social = socialProof(product, archetypeId, recSize);
  const hesitation = product.sku_hesitation_index;
  const raw = 0.5 * fitMatchPct + 0.3 * social.rate + 0.2 * (100 - hesitation);
  const confidence = clampScore(Math.round(raw), 0, 100);
  const tier = confidence >= 80 ? "high" : confidence >= 60 ? "medium" : "low";
  const contributions = {
    fit: Math.round(0.5 * fitMatchPct * 10) / 10,
    social: Math.round(0.3 * social.rate * 10) / 10,
    friction: Math.round(0.2 * (100 - hesitation) * 10) / 10
  };
  return { fitMatchPct, social, hesitation, confidence, tier, contributions, recommendedSize: recSize };
}
function computeReturnRate(orders, returns) {
  const eligible = orders.filter(o => o.status === "Delivered" || (o.status && o.status.indexOf("Return") === -1 && o.status !== "Ordered")).length;
  if (eligible === 0) return 0;
  return Math.round((returns.length / eligible) * 1000) / 10;
}
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDateIN(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return d + " " + MONTH_ABBR[m - 1] + " " + y;
}
/* ===================================================================== */
/* === PURE HELPERS END === */
/* ===================================================================== */

/* ---------------------------- BRANDS ---------------------------- */
const BRANDS = [
  { id: "speedstyle", name: "SpeedStyle", posture: "Automate-heavy, Self-Directed",
    hardLimit: "Synthetic imagery labelled; no implied fit accuracy beyond product capability",
    accent: "#e8491d", accentDark: "#b3350f", headingFont: '"Arial Narrow", "Oswald", sans-serif', bodyFont: 'system-ui, sans-serif',
    bg: "#141414", surface: "#1f1f1f", text: "#f5f5f5", muted: "#a3a3a3", border: "#3a3a3a", contrast: "high",
    tagline: "Fast fashion, faster fit answers.",
    disclosure_mode: "Self-Directed", ai_tooling_mode: "full_llm", client_facing_generative: true, escalation_visible: false,
    seeded_return_rate_target: 28, seeded_return_rate_tier: "A (case)", price_band: [499, 2999], hesitation_nudge_threshold: 25 },
  { id: "urbanedge", name: "UrbanEdge", posture: "Balanced, Self-Directed",
    hardLimit: "Disclosure at every AI touchpoint, one-tap human escalation always visible",
    accent: "#2563eb", accentDark: "#1d4ed8", headingFont: 'system-ui, sans-serif', bodyFont: 'system-ui, sans-serif',
    bg: "#f3f6fb", surface: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#dbeafe", contrast: "mid",
    tagline: "Everyday style, always a human within reach.",
    disclosure_mode: "Self-Directed", ai_tooling_mode: "full_llm", client_facing_generative: true, escalation_visible: true,
    seeded_return_rate_target: 21, seeded_return_rate_tier: "C (team interpretation)", price_band: [1299, 4999], hesitation_nudge_threshold: 30 },
  { id: "maisonluxe", name: "Maison Luxe", posture: "Amplify-dominant, Advisor-Mediated",
    hardLimit: "Generative content PROHIBITED client-facing — a client never meets a bot first",
    accent: "#8a7250", accentDark: "#6b5738", headingFont: 'Georgia, "Times New Roman", serif', bodyFont: 'Georgia, serif',
    bg: "#faf8f5", surface: "#ffffff", text: "#2b2620", muted: "#8a7f70", border: "#e8e0d3", contrast: "low",
    tagline: "A client never meets a bot first.",
    disclosure_mode: "Advisor-Mediated", ai_tooling_mode: "internal_llm_only", client_facing_generative: false, escalation_visible: null,
    seeded_return_rate_target: 9, seeded_return_rate_tier: "A (case)", price_band: [12000, 48000], hesitation_nudge_threshold: 40 },
  { id: "ecoweave", name: "EcoWeave", posture: "Augment-led",
    hardLimit: "Zero generative fallback on claims; every claim must trace to verified data",
    accent: "#4f7942", accentDark: "#3d5e33", headingFont: 'system-ui, sans-serif', bodyFont: 'system-ui, sans-serif',
    bg: "#f6f8f2", surface: "#ffffff", text: "#1f2a17", muted: "#6b7a5e", border: "#dbe6cf", contrast: "natural",
    tagline: "Every claim traces to verified supplier data.",
    disclosure_mode: "Advisor-Mediated", ai_tooling_mode: "retrieval_only", client_facing_generative: false, escalation_visible: false,
    seeded_return_rate_target: 16, seeded_return_rate_tier: "C (team interpretation)", price_band: [1999, 6999], hesitation_nudge_threshold: 35 },
  { id: "threadbasics", name: "ThreadBasics", posture: "Rules-engine automate",
    hardLimit: "Cheapest viable AI, no bespoke models; still full model-card obligation",
    accent: "#334155", accentDark: "#1e293b", headingFont: 'system-ui, sans-serif', bodyFont: 'system-ui, sans-serif',
    bg: "#f4f5f7", surface: "#ffffff", text: "#111827", muted: "#6b7280", border: "#e2e8f0", contrast: "none",
    tagline: "No-frills basics, honestly automated.",
    disclosure_mode: "Self-Directed", ai_tooling_mode: "rules_engine_only", client_facing_generative: false, escalation_visible: false,
    seeded_return_rate_target: 19, seeded_return_rate_tier: "C (team interpretation)", price_band: [299, 1799], hesitation_nudge_threshold: 30 }
];

/* ---------------------------- ARCHETYPES ---------------------------- */
// shoulderHW/waistHW/hipHW/legLen/armLen are the canonical Interactive Fit Model
// geometry from the Storefront v1 — kept unchanged per contract §3.
const ARCHETYPES = [
  { id: "petite-slim", label: "Petite/Slim", measurementRange: "4'10\"–5'2\", slim frame, narrow shoulders",
    shoulderHW: 30, waistHW: 22, hipHW: 26, legLen: 128, armLen: 96,
    height_cm: [147, 157], bust_in: [30, 32], waist_in: [24, 26], hip_in: [33, 35], base_apparel_size: "S", base_footwear_uk: 5 },
  { id: "regular-athletic", label: "Regular/Athletic", measurementRange: "5'3\"–5'7\", athletic build, defined waist",
    shoulderHW: 36, waistHW: 26, hipHW: 30, legLen: 150, armLen: 108,
    height_cm: [160, 170], bust_in: [34, 36], waist_in: [27, 29], hip_in: [35, 37], base_apparel_size: "M", base_footwear_uk: 7 },
  { id: "tall-broad", label: "Tall/Broad-shoulder", measurementRange: "5'8\"–6'0\", broad shoulders, long torso",
    shoulderHW: 44, waistHW: 28, hipHW: 32, legLen: 172, armLen: 118,
    height_cm: [173, 183], bust_in: [40, 43], waist_in: [32, 35], hip_in: [39, 41], base_apparel_size: "L", base_footwear_uk: 9 },
  { id: "curvy-regular", label: "Curvy/Regular", measurementRange: "5'3\"–5'7\", fuller bust/hip, defined waist",
    shoulderHW: 33, waistHW: 27, hipHW: 40, legLen: 148, armLen: 106,
    height_cm: [160, 170], bust_in: [37, 40], waist_in: [30, 32], hip_in: [40, 43], base_apparel_size: "L", base_footwear_uk: 7 },
  { id: "plus-relaxed", label: "Plus/Relaxed-fit", measurementRange: "5'4\"–5'9\", fuller figure, prefers relaxed fit",
    shoulderHW: 42, waistHW: 42, hipHW: 46, legLen: 144, armLen: 110,
    height_cm: [163, 175], bust_in: [44, 48], waist_in: [38, 42], hip_in: [46, 50], base_apparel_size: "XL", base_footwear_uk: 8 },
  { id: "petite-curvy", label: "Petite/Curvy", measurementRange: "4'10\"–5'3\", curvy frame on a petite build",
    shoulderHW: 29, waistHW: 25, hipHW: 36, legLen: 122, armLen: 94,
    height_cm: [147, 160], bust_in: [34, 37], waist_in: [28, 31], hip_in: [38, 41], base_apparel_size: "M", base_footwear_uk: 5 },
  { id: "tall-slim", label: "Tall/Slim", measurementRange: "5'8\"–6'2\", slim build, long limbs",
    shoulderHW: 32, waistHW: 22, hipHW: 26, legLen: 178, armLen: 120,
    height_cm: [173, 188], bust_in: [33, 35], waist_in: [26, 28], hip_in: [35, 37], base_apparel_size: "M", base_footwear_uk: 9 },
  { id: "regular-broad", label: "Regular/Broad", measurementRange: "5'4\"–5'8\", broad shoulders, straight build",
    shoulderHW: 41, waistHW: 31, hipHW: 33, legLen: 146, armLen: 108,
    height_cm: [162, 173], bust_in: [38, 41], waist_in: [31, 34], hip_in: [37, 39], base_apparel_size: "L", base_footwear_uk: 8 }
];
const ARCHETYPES_BY_ID = {}; ARCHETYPES.forEach(a => ARCHETYPES_BY_ID[a.id] = a);

function nearestCentroidArchetype(heightCm, bustIn, waistIn, hipIn) {
  let best = null, bestDist = Infinity;
  ARCHETYPES.forEach(a => {
    const mid = arr => (arr[0] + arr[1]) / 2;
    const dh = (heightCm - mid(a.height_cm)) / 20;
    const db = (bustIn - mid(a.bust_in)) / 6;
    const dw = (waistIn - mid(a.waist_in)) / 6;
    const dhp = (hipIn - mid(a.hip_in)) / 6;
    const dist = dh * dh + db * db + dw * dw + dhp * dhp;
    if (dist < bestDist) { bestDist = dist; best = a; }
  });
  return best.id;
}

/* ---------------------------- FIT MATRIX ---------------------------- */
const DIRECTIONS = ["true_to_size", "runs_tight", "runs_loose"];
function buildFitMatrix() {
  const m = {};
  CATEGORIES.forEach(cat => {
    m[cat] = {};
    const zones = ZONES_BY_CATEGORY[cat];
    if (!zones.length) return; // Accessories: no fit matrix
    ARCHETYPES.forEach(arch => {
      const cell = {};
      zones.forEach(zone => {
        const rng = rngFor("fitmatrix", cat, arch.id, zone);
        cell[zone] = pickWeighted(rng, [["true_to_size", 60], ["runs_tight", 25], ["runs_loose", 15]]);
      });
      m[cat][arch.id] = cell;
    });
  });
  return m;
}
const fitMatrix = buildFitMatrix();
// Hand-tuned realism overrides — anchors confidenceAdjustmentLog entries below.
// (Footwear's dominant zone uses "width", not "waist" — B-fix from v1's bug.)
fitMatrix.Outerwear["tall-broad"].shoulders = "runs_tight";
fitMatrix.Tops["regular-athletic"].chest = "true_to_size";
fitMatrix.Dresses["curvy-regular"].waist = "runs_tight";
fitMatrix.Bottoms["petite-curvy"].inseam = "runs_loose";
fitMatrix.Footwear["regular-broad"].width = "runs_tight";

const confidenceAdjustmentLog = [
  { category: "Outerwear", archetypeId: "tall-broad", zone: "shoulders", oldValue: "true_to_size", newValue: "runs_tight",
    reason: "Shoulder fit downgraded after 12 fit-driven returns citing tightness for Tall/Broad-shoulder customers.", date: "2026-07-14" },
  { category: "Tops", archetypeId: "regular-athletic", zone: "chest", oldValue: "runs_loose", newValue: "true_to_size",
    reason: "Recalibrated after kept-it rate improved among Regular/Athletic shoppers over Q2.", date: "2026-06-02" },
  { category: "Dresses", archetypeId: "curvy-regular", zone: "waist", oldValue: "true_to_size", newValue: "runs_tight",
    reason: "Adjusted after a return spike citing waist tightness for Curvy/Regular shoppers.", date: "2026-08-01" },
  { category: "Bottoms", archetypeId: "petite-curvy", zone: "inseam", oldValue: "runs_tight", newValue: "runs_loose",
    reason: "Updated after repeated hemming/length complaints from Petite/Curvy shoppers.", date: "2026-05-20" },
  { category: "Footwear", archetypeId: "regular-broad", zone: "width", oldValue: "true_to_size", newValue: "runs_tight",
    reason: "Width sizing guidance adjusted after fit-driven returns for Regular/Broad shoppers.", date: "2026-07-29" }
];
// verifiability check (contract §5): at least one log entry's newValue equals the live matrix cell.
(function assertLogMatchesMatrix() {
  const ok = confidenceAdjustmentLog.some(e => fitMatrix[e.category][e.archetypeId][e.zone] === e.newValue);
  if (!ok) throw new Error("confidenceAdjustmentLog has no entry matching the live fit matrix");
})();

/* ---------------------------- PRODUCTS (60, 12/brand) ---------------------------- */
const PRODUCT_DEFS = {
  speedstyle: [
    ["ss-top", "Neon Rush Graphic Tee", "Tops"], ["ss-top2", "Reflective Mesh Tank", "Tops"],
    ["ss-bottom", "Turbo-Fit Track Pants", "Bottoms"], ["ss-bottom2", "Cargo Jogger Pants", "Bottoms"],
    ["ss-outer", "Blitz Windbreaker Jacket", "Outerwear"], ["ss-outer2", "Thermal Zip Hoodie", "Outerwear"],
    ["ss-foot", "Velocity Sneaker Low", "Footwear"], ["ss-foot2", "Trail Runner High", "Footwear"],
    ["ss-dress", "Flash Bodycon Dress", "Dresses"], ["ss-dress2", "Sprint Tank Dress", "Dresses"],
    ["ss-acc", "Pulse Cap Snapback", "Accessories"], ["ss-acc2", "Performance Wristband Set", "Accessories"]
  ],
  urbanedge: [
    ["ue-top", "Everyday Oxford Shirt", "Tops"], ["ue-top2", "Relaxed Denim Shirt", "Tops"],
    ["ue-bottom", "Straight-Fit Chinos", "Bottoms"], ["ue-bottom2", "Slim Cargo Pants", "Bottoms"],
    ["ue-outer", "Commuter Bomber Jacket", "Outerwear"], ["ue-outer2", "Quilted Field Jacket", "Outerwear"],
    ["ue-foot", "City Trekker Boots", "Footwear"], ["ue-foot2", "Suede Chelsea Boots", "Footwear"],
    ["ue-dress", "Weekend Wrap Dress", "Dresses"], ["ue-dress2", "Shirt-Collar Midi Dress", "Dresses"],
    ["ue-acc", "Canvas Crossbody Bag", "Accessories"], ["ue-acc2", "Woven Belt Bag", "Accessories"]
  ],
  maisonluxe: [
    ["ml-top", "Silk Charmeuse Blouse", "Tops"], ["ml-top2", "Silk Wrap Blouse", "Tops"],
    ["ml-bottom", "Tailored Wool Trousers", "Bottoms"], ["ml-bottom2", "Pleated Silk Trousers", "Bottoms"],
    ["ml-outer", "Cashmere Wrap Coat", "Outerwear"], ["ml-outer2", "Merino Wool Cape", "Outerwear"],
    ["ml-foot", "Handcrafted Leather Loafers", "Footwear"], ["ml-foot2", "Suede Ankle Boots", "Footwear"],
    ["ml-dress", "Draped Satin Evening Gown", "Dresses"], ["ml-dress2", "Silk Charmeuse Slip Dress", "Dresses"],
    ["ml-acc", "Gold-Plated Statement Necklace", "Accessories"], ["ml-acc2", "Pearl Drop Earrings", "Accessories"]
  ],
  ecoweave: [
    ["ew-top", "Organic Cotton Henley", "Tops"], ["ew-top2", "Bamboo-Blend Tee", "Tops"],
    ["ew-bottom", "Hemp-Blend Wide Trousers", "Bottoms"], ["ew-bottom2", "Recycled Denim Jeans", "Bottoms"],
    ["ew-outer", "Recycled Wool Overcoat", "Outerwear"], ["ew-outer2", "Organic Cotton Field Jacket", "Outerwear"],
    ["ew-foot", "Cork-Sole Slip-On Sneakers", "Footwear"], ["ew-foot2", "Recycled Canvas Slip-Ons", "Footwear"],
    ["ew-dress", "Linen Midi Wrap Dress", "Dresses"], ["ew-dress2", "Organic Cotton Shirt Dress", "Dresses"],
    ["ew-acc", "Jute-Weave Tote Bag", "Accessories"], ["ew-acc2", "Cork-Trim Crossbody", "Accessories"]
  ],
  threadbasics: [
    ["tb-top", "Essential Crew Tee", "Tops"], ["tb-top2", "Long-Sleeve Waffle Tee", "Tops"],
    ["tb-bottom", "Basic Denim Jeans", "Bottoms"], ["tb-bottom2", "Relaxed Cargo Pants", "Bottoms"],
    ["tb-outer", "Everyday Zip Hoodie", "Outerwear"], ["tb-outer2", "Fleece Half-Zip", "Outerwear"],
    ["tb-foot", "Classic Canvas Shoes", "Footwear"], ["tb-foot2", "Everyday Slip-On Sneakers", "Footwear"],
    ["tb-dress", "Simple A-Line Dress", "Dresses"], ["tb-dress2", "Ribbed Tank Dress", "Dresses"],
    ["tb-acc", "Cotton Beanie", "Accessories"], ["tb-acc2", "Ribbed Knit Scarf", "Accessories"]
  ]
};

const COPY_TEMPLATES = {
  Tops: (b) => `Everyday layering piece cut for ${b.toLowerCase() === "maison luxe" ? "a considered wardrobe" : "how you actually move"} — built to a consistent block across sizes.`,
  Bottoms: () => `A straight, size-consistent block through the waist and hip, tapered to a clean line at the hem.`,
  Outerwear: () => `Outer-layer piece with room to layer underneath — shoulder seam placement is the main size signal here.`,
  Footwear: () => `Sits true through the midfoot with a break-in day if you're between widths — check the width note in the fit panel.`,
  Dresses: () => `Bust and waist are the two zones that decide the size here; the hem is cut consistent across the run.`,
  Accessories: () => `One size, adjustable where it matters.`
};
const EVENING_OVERRIDE = { "ml-dress": "An evening silhouette in fluid satin — close through the bust, with a fluid drape from the waist down.",
  "ml-dress2": "A slip silhouette in silk charmeuse — cut close, with a bias drape that follows the body." };

const VERIFIED_CLAIM_POOL = [
  { claim: "Recycled material content", certifier: "GRS (Global Recycled Standard)" },
  { claim: "Water saved vs. conventional dyeing", certifier: "Internal LCA, reviewed by Bluesign partner" },
  { claim: "Certified organic fiber content", certifier: "GOTS" },
  { claim: "Carbon offset per unit shipped", certifier: "Internal sustainability desk" },
  { claim: "Traceable supplier of record", certifier: "Supplier compliance audit" }
];

function buildProducts() {
  const list = [];
  Object.keys(PRODUCT_DEFS).forEach(brandId => {
    const brand = BRANDS.find(b => b.id === brandId);
    const [lo, hi] = brand.price_band;
    PRODUCT_DEFS[brandId].forEach(([id, name, category]) => {
      const rng = rngFor("product", id);
      const fitApplicable = category !== "Accessories";
      const priceStep = category === "Accessories" ? 50 : 100;
      let price = randInt(rng, lo, hi);
      price = Math.round(price / priceStep) * priceStep;
      const baseFitPct = randInt(rng, 60, 92);
      const hesitationIdx = randInt(rng, 10, 55);
      const product = {
        id, name, brandId, category,
        priceInr: price,
        base_fit_pct: fitApplicable ? baseFitPct : null,
        sku_hesitation_index: hesitationIdx,
        fit_applicable: fitApplicable,
        description: brandId === "maisonluxe" && EVENING_OVERRIDE[id] ? EVENING_OVERRIDE[id] : COPY_TEMPLATES[category](brand.name)
      };
      if (brandId === "ecoweave") {
        const nClaims = randInt(rng, 1, 2);
        const shuffled = VERIFIED_CLAIM_POOL.slice().sort(() => rng() - 0.5);
        product.verified_claims = shuffled.slice(0, nClaims).map(c => ({
          claim: c.claim,
          value: (randInt(rng, 30, 85)) + "%",
          source_doc_id: "EW-SRC-" + randInt(rng, 1000, 9999),
          certifier: c.certifier,
          verified_on: "2026-0" + randInt(rng, 3, 8) + "-1" + randInt(rng, 0, 9),
          note: "illustrative"
        }));
      }
      list.push(product);
    });
  });
  return list;
}
const products = buildProducts();

/* ---------------------------- FIT FEEDBACK (aggregated) ---------------------------- */
function buildFitFeedback(product) {
  if (!product.fit_applicable) return {};
  const rng = rngFor("feedback", product.id);
  const totalEvents = randInt(rng, 150, 300);
  const agg = {};
  ARCHETYPES.forEach(a => { agg[a.id] = {}; });
  for (let i = 0; i < totalEvents; i++) {
    const arch = pick(rng, ARCHETYPES);
    const recSize = recommendedSize(product, arch.id, fitMatrix, ARCHETYPES_BY_ID);
    const run = sizeRunFor(product);
    const recIdx = run.indexOf(recSize);
    let size = recSize;
    if (rng() > 0.7) {
      const step = rng() < 0.5 ? -1 : 1;
      size = run[clampScore(recIdx + step, 0, run.length - 1)];
    }
    const mismatchPenalty = size === recSize ? 0 : 0.25;
    const keptProb = clampScore((product.base_fit_pct / 100) - mismatchPenalty + (rng() - 0.5) * 0.1, 0.05, 0.97);
    const kept = rng() < keptProb;
    if (!agg[arch.id][size]) agg[arch.id][size] = { kept: 0, returned: 0 };
    if (kept) agg[arch.id][size].kept++; else agg[arch.id][size].returned++;
  }
  return agg;
}
products.forEach(p => { p.fitFeedback = buildFitFeedback(p); });

/* ---------------------------- DATE HELPERS ---------------------------- */
function addDays(iso, delta) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear(), mm = String(dt.getUTCMonth() + 1).padStart(2, "0"), dd = String(dt.getUTCDate()).padStart(2, "0");
  return yy + "-" + mm + "-" + dd;
}
function dateFor(status, daysAgo) {
  return addDays(DEMO_TODAY, -daysAgo);
}

/* ---------------------------- PERSONAS ---------------------------- */
// Canonical named customers — keep ids/names/brand/scenario from v1; attach console_id.
// B10 fix: Ananya's case text now matches her return's real step (exchange-offer, unresolved).
// B: advisor rename Maison Luxe "Priya" -> "Meher" (collision with customer Priya Nair).
// Priya Nair's SV-ORD-9201 carries delivery_exception:true (contract §8 Grievance Radar seed).
// Karan Mehta / Vikram Chatterjee: marketplace history now lives ONLY in marketplaceOrderPool
// (buyer_alias-keyed, contract §9/A4) — never pre-populated under their name.
const personas = [
  { id: "p1", console_id: "cust_001", name: "Rohan Verma", brandId: "speedstyle", scenario: 1,
    scenarioLabel: "D2C-native shopper with a complete Fit Passport and order history",
    loyaltyId: "SV-10021", bridgingStatus: "not-applicable", claimStatus: "not-applicable",
    fitPassport: { archetypeId: "regular-athletic", tier: "full", passportConfidence: 92, completedAt: dateFor("x", 145), consent: { use_for_sizing: true, share_with_advisors: true, include_claimed_marketplace: false } },
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: false, proactiveOutreachSent: false,
    orders: [
      { id: "SV-ORD-9001", channel: "d2c", date: dateFor("x", 28), status: "Delivered", items: [{ productId: "ss-top", size: "M", qty: 1 }] },
      { id: "SV-ORD-9002", channel: "d2c", date: dateFor("x", 46), status: "Delivered", items: [{ productId: "ss-foot", size: "7", qty: 1 }] },
      { id: "SV-ORD-9003", channel: "d2c", date: dateFor("x", 68), status: "Delivered", items: [{ productId: "ss-acc", size: "One Size", qty: 2 }] },
      { id: "SV-ORD-9004", channel: "d2c", date: dateFor("x", 5), status: "Shipped", items: [{ productId: "ss-bottom", size: "M", qty: 1 }] },
      { id: "SV-ORD-9005", channel: "d2c", date: dateFor("x", 1), status: "Ordered", items: [{ productId: "ss-outer", size: "L", qty: 1 }] },
      { id: "SV-ORD-9006", channel: "d2c", date: dateFor("x", 105), status: "Delivered", items: [{ productId: "ss-dress", size: "M", qty: 1 }] }
    ], marketplaceOrders: [],
    returns: [
      { id: "SV-RET-410", orderId: "SV-ORD-9006", productId: "ss-dress", size: "M", status: "exchanged",
        reason: "size_fit", fitDecoded: { fit_driven: true, zone: "chest", direction: "runs_loose" }, step: "exchange-confirm",
        resolvedType: "exchange", exchangeSize: "S", trackingRef: null, newDeliveryDate: dateFor("x", 99), date: dateFor("x", 103) }
    ],
    cases: [
      { id: "CASE-101", subject: "Sizing question — Turbo-Fit Track Pants", predictedGrievance: false,
        channelLog: [
          { from: "customer", channel: "chat", text: "Do the track pants run true to size for a 5'9\" athletic build?", ts: "2026-07-17T09:12:00" },
          { from: "system", channel: "chat", text: "Thanks — we'll get back to you shortly.", ts: "2026-07-17T09:12:40" },
          { from: "system", channel: "chat", text: "For Regular/Athletic builds these run true to size at the waist with a touch of room at the hem — your usual size is the right call.", ts: "2026-07-17T09:15:00" }
        ] }
    ] },

  { id: "p2", console_id: "cust_002", name: "Ananya Iyer", brandId: "speedstyle", scenario: 6,
    scenarioLabel: "Has a fit-driven return mid-flow — resumable right where they left off",
    loyaltyId: "SV-10098", bridgingStatus: "not-applicable", claimStatus: "not-applicable",
    fitPassport: { archetypeId: "tall-broad", tier: "basic", passportConfidence: 68, completedAt: dateFor("x", 137), consent: { use_for_sizing: true, share_with_advisors: false, include_claimed_marketplace: false } },
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: false, proactiveOutreachSent: false,
    orders: [
      { id: "SV-ORD-9101", channel: "d2c", date: dateFor("x", 36), status: "Return in Progress", items: [{ productId: "ss-outer", size: "M", qty: 1 }] },
      { id: "SV-ORD-9102", channel: "d2c", date: dateFor("x", 71), status: "Delivered", items: [{ productId: "ss-top", size: "L", qty: 1 }] },
      { id: "SV-ORD-9103", channel: "d2c", date: dateFor("x", 87), status: "Delivered", items: [{ productId: "ss-foot", size: "9", qty: 1 }] },
      { id: "SV-ORD-9104", channel: "d2c", date: dateFor("x", 107), status: "Delivered", items: [{ productId: "ss-acc", size: "One Size", qty: 1 }] }
    ], marketplaceOrders: [],
    returns: [
      { id: "SV-RET-501", orderId: "SV-ORD-9101", productId: "ss-outer", size: "M", status: "in_progress",
        reason: "size_fit", fitDecoded: { fit_driven: true, zone: "shoulders", direction: "runs_tight" }, step: "exchange-offer",
        resolvedType: null, exchangeSize: null, trackingRef: null, date: dateFor("x", 34) },
      { id: "SV-RET-402", orderId: "SV-ORD-9103", productId: "ss-foot", size: "9", status: "requested",
        reason: "quality_issue", fitDecoded: null, step: "return-confirm",
        resolvedType: "return", exchangeSize: null, trackingRef: "RET-TRK-773204", pickupPref: "pickup", refundPref: "original", date: dateFor("x", 79) }
    ],
    cases: [
      { id: "CASE-102", subject: "Update on exchange for SV-ORD-9101", predictedGrievance: false,
        channelLog: [
          { from: "customer", channel: "chat", text: "Hi, any update on the exchange for my windbreaker jacket?", ts: "2026-08-23T14:02:00" },
          { from: "system", channel: "chat", text: "Thanks — we'll get back to you shortly.", ts: "2026-08-23T14:02:40" },
          { from: "system", channel: "email", text: "We're finalising the exchange details for your Blitz Windbreaker Jacket (running tight in the shoulders for your build) — you'll get a confirmation with a size and ship date as soon as it's ready.", ts: "2026-08-23T15:40:00" }
        ] }
    ] },

  { id: "p3", console_id: "cust_003", name: "Karan Mehta", brandId: "urbanedge", scenario: 2,
    scenarioLabel: "Marketplace-only shopper — hasn't claimed their marketplace orders yet",
    loyaltyId: "SV-10190", bridgingStatus: "none", claimStatus: "unclaimed",
    fitPassport: null,
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: false, proactiveOutreachSent: false,
    orders: [], marketplaceOrders: [], returns: [],
    cases: [
      { id: "CASE-103", subject: "Can I link my marketplace orders here?", predictedGrievance: false,
        channelLog: [
          { from: "customer", channel: "chat", text: "I've bought UrbanEdge stuff on the marketplace app before — can I see that history here?", ts: "2026-08-30T11:20:00" },
          { from: "system", channel: "chat", text: "Thanks — we'll get back to you shortly.", ts: "2026-08-30T11:20:40" },
          { from: "system", channel: "chat", text: "Yes — go to Account → Claim marketplace orders. Enter one order ID (or scan the package-insert QR) and we'll match the rest and merge them into Track Everywhere.", ts: "2026-08-30T11:23:00" }
        ] }
    ] },

  { id: "p4", console_id: "cust_004", name: "Priya Nair", brandId: "urbanedge", scenario: 7,
    scenarioLabel: "Predicted delay on a recent order — proactive outreach waiting for them",
    loyaltyId: "SV-10233", bridgingStatus: "not-applicable", claimStatus: "not-applicable",
    fitPassport: { archetypeId: "curvy-regular", tier: "full", passportConfidence: 88, completedAt: dateFor("x", 191), consent: { use_for_sizing: true, share_with_advisors: true, include_claimed_marketplace: false } },
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: true, proactiveOutreachSent: false,
    orders: [
      { id: "SV-ORD-9201", channel: "d2c", date: dateFor("x", 6), status: "In Transit", delivery_exception: true, items: [{ productId: "ue-outer", size: "M", qty: 1 }] },
      { id: "SV-ORD-9202", channel: "d2c", date: dateFor("x", 54), status: "Delivered", items: [{ productId: "ue-dress", size: "M", qty: 1 }] },
      { id: "SV-ORD-9203", channel: "d2c", date: dateFor("x", 90), status: "Delivered", items: [{ productId: "ue-top", size: "M", qty: 2 }] }
    ], marketplaceOrders: [], returns: [],
    cases: [
      { id: "CASE-301", subject: "Order SV-ORD-9201 — possible delivery delay", predictedGrievance: true,
        channelLog: [
          { from: "system", channel: "chat", text: "We noticed a possible delay with your recent order (SV-ORD-9201) — here's what we're doing about it: your courier partner is running behind in your area, and we've already flagged this order for priority dispatch. We expect it to move within 24 hours.", ts: "2026-09-19T10:15:00" },
          { from: "customer", channel: "chat", text: "Thanks for the heads up — is there a new delivery estimate yet?", ts: "2026-09-19T10:41:00" },
          { from: "system", channel: "email", text: "Updated estimate: your Commuter Bomber Jacket is now expected within 3 days. We'll notify you the moment it ships.", ts: "2026-09-19T12:05:00" },
          { from: "customer", channel: "call", text: "Called in to confirm — agent verified the new dispatch window and offered a delivery credit for the delay.", ts: "2026-09-20T16:30:00" }
        ] }
    ] },

  { id: "p5", console_id: "cust_005", name: "Vikram Chatterjee", brandId: "maisonluxe", scenario: 3,
    scenarioLabel: "Marketplace shopper — mid-way through claiming their orders",
    loyaltyId: "SV-10344", bridgingStatus: "started", claimStatus: "started",
    fitPassport: { archetypeId: "tall-slim", tier: "basic", passportConfidence: 60, completedAt: dateFor("x", 212), consent: { use_for_sizing: true, share_with_advisors: true, include_claimed_marketplace: false } },
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: false, proactiveOutreachSent: false,
    orders: [], marketplaceOrders: [], returns: [],
    cases: [
      { id: "CASE-104", subject: "Finishing my order claim", predictedGrievance: false,
        channelLog: [
          { from: "customer", channel: "email", text: "I started claiming a marketplace order but got interrupted — will the rest merge once I finish?", ts: "2026-08-25T08:00:00" },
          { from: "system", channel: "email", text: "Your Style Advisor, Meher — Yes, once you complete the claim from your account page, we'll match and merge your other marketplace orders into Track Everywhere. Happy to walk you through it on a call if that's easier.", ts: "2026-08-25T09:30:00" }
        ] }
    ] },

  { id: "p6", console_id: "cust_006", name: "Ishaan Kapoor", brandId: "maisonluxe", scenario: 9,
    scenarioLabel: "Bridged account with order history across both channels",
    loyaltyId: "SV-10455", bridgingStatus: "linked", claimStatus: "claimed",
    fitPassport: { archetypeId: "tall-broad", tier: "full", passportConfidence: 90, completedAt: dateFor("x", 238), consent: { use_for_sizing: true, share_with_advisors: true, include_claimed_marketplace: true } },
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: false, proactiveOutreachSent: false,
    orders: [
      { id: "SV-ORD-9401", channel: "d2c", date: dateFor("x", 31), status: "Delivered", items: [{ productId: "ml-outer", size: "L", qty: 1 }] },
      { id: "SV-ORD-9402", channel: "d2c", date: dateFor("x", 82), status: "Delivered", items: [{ productId: "ml-dress", size: "L", qty: 1 }] },
      { id: "SV-ORD-9403", channel: "d2c", date: dateFor("x", 126), status: "Delivered", items: [{ productId: "ml-foot", size: "9", qty: 1 }] }
    ], marketplaceOrders: [
      { id: "MKT-7901", channel: "marketplace", date: dateFor("x", 105), status: "Delivered", items: [{ productId: "ml-bottom", size: "L", qty: 1 }] },
      { id: "MKT-7902", channel: "marketplace", date: dateFor("x", 55), status: "Delivered", items: [{ productId: "ml-acc", size: "One Size", qty: 1 }] }
    ],
    returns: [
      { id: "SV-RET-620", orderId: "SV-ORD-9402", productId: "ml-dress", size: "L", status: "exchanged",
        reason: "size_fit", fitDecoded: { fit_driven: true, zone: "waist", direction: "runs_tight" }, step: "exchange-confirm",
        resolvedType: "exchange", exchangeSize: "XL", trackingRef: null, newDeliveryDate: dateFor("x", 76), date: dateFor("x", 80) }
    ],
    cases: [
      { id: "CASE-105", subject: "Alterations question on the Cashmere Wrap Coat", predictedGrievance: false,
        channelLog: [
          { from: "customer", channel: "call", text: "Called in about sleeve length on the wrap coat — advisor Meher noted preference for a half-inch shorter cuff on future pieces.", ts: "2026-08-27T17:00:00" },
          { from: "system", channel: "email", text: "Your Style Advisor, Meher — noted your cuff preference on file for next season's pieces. Always a pleasure, Ishaan.", ts: "2026-08-27T18:10:00" }
        ] }
    ] },

  { id: "p7", console_id: "cust_007", name: "Meera Pillai", brandId: "ecoweave", scenario: 4,
    scenarioLabel: "Bridged account — marketplace and D2C history merged after claiming",
    loyaltyId: "SV-10566", bridgingStatus: "linked", claimStatus: "claimed",
    fitPassport: { archetypeId: "petite-slim", tier: "full", passportConfidence: 85, completedAt: dateFor("x", 200), consent: { use_for_sizing: true, share_with_advisors: false, include_claimed_marketplace: true } },
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: false, proactiveOutreachSent: false,
    orders: [
      { id: "SV-ORD-9501", channel: "d2c", date: dateFor("x", 4), status: "Out for Delivery", items: [{ productId: "ew-top", size: "S", qty: 1 }] },
      { id: "SV-ORD-9502", channel: "d2c", date: dateFor("x", 76), status: "Delivered", items: [{ productId: "ew-dress", size: "S", qty: 1 }] },
      { id: "SV-ORD-9503", channel: "d2c", date: dateFor("x", 118), status: "Delivered", items: [{ productId: "ew-bottom", size: "S", qty: 1 }] }
    ], marketplaceOrders: [
      { id: "MKT-8001", channel: "marketplace", date: dateFor("x", 112), status: "Delivered", items: [{ productId: "ew-acc", size: "One Size", qty: 1 }] },
      { id: "MKT-8002", channel: "marketplace", date: dateFor("x", 41), status: "Delivered", items: [{ productId: "ew-foot", size: "5", qty: 1 }] }
    ],
    returns: [
      { id: "SV-RET-711", orderId: "SV-ORD-9503", productId: "ew-bottom", size: "S", status: "requested",
        reason: "no_longer_needed", fitDecoded: null, step: "return-confirm",
        resolvedType: "return", exchangeSize: null, trackingRef: "RET-TRK-551982", pickupPref: "dropoff", refundPref: "wallet", date: dateFor("x", 113) }
    ],
    cases: [
      { id: "CASE-106", subject: "Sourcing question — Recycled Wool Overcoat", predictedGrievance: false,
        channelLog: [
          { from: "customer", channel: "email", text: "Can you confirm the wool percentage that's recycled on the overcoat? Want to make sure before I buy.", ts: "2026-08-20T10:00:00" },
          { from: "system", channel: "email", text: "Verified from our supplier data sheet — see the Verified Claims panel on the product page for the exact recycled-content percentage and certifier. Certificate available on request.", ts: "2026-08-20T13:45:00" }
        ] }
    ] },

  { id: "p8", console_id: "cust_008", name: "Aditi Rao", brandId: "ecoweave", scenario: 8,
    scenarioLabel: "Shopping for someone else, with a saved secondary fit profile",
    loyaltyId: "SV-10677", bridgingStatus: "not-applicable", claimStatus: "not-applicable",
    fitPassport: { archetypeId: "petite-curvy", tier: "full", passportConfidence: 84, completedAt: dateFor("x", 156), consent: { use_for_sizing: true, share_with_advisors: false, include_claimed_marketplace: false } },
    shoppingFor: "myself",
    secondaryProfile: { name: "Rahul (gift recipient)", archetypeId: "tall-slim" },
    predictedGrievance: false, proactiveOutreachSent: false,
    orders: [
      { id: "SV-ORD-9601", channel: "d2c", date: dateFor("x", 39), status: "Delivered", items: [{ productId: "ew-bottom", size: "S", qty: 1 }] },
      { id: "SV-ORD-9602", channel: "d2c", date: dateFor("x", 59), status: "Delivered", items: [{ productId: "ew-outer", size: "S", qty: 1 }] },
      { id: "SV-ORD-9603", channel: "d2c", date: dateFor("x", 103), status: "Delivered", items: [{ productId: "ew-top", size: "S", qty: 1 }] },
      { id: "SV-ORD-9604", channel: "d2c", date: dateFor("x", 129), status: "Delivered", items: [{ productId: "ew-dress", size: "S", qty: 1 }] }
    ], marketplaceOrders: [],
    returns: [
      { id: "SV-RET-812", orderId: "SV-ORD-9604", productId: "ew-dress", size: "S", status: "exchanged",
        reason: "size_fit", fitDecoded: { fit_driven: true, zone: "length", direction: "runs_loose" }, step: "exchange-confirm",
        resolvedType: "exchange", exchangeSize: "S", trackingRef: null, newDeliveryDate: dateFor("x", 122), date: dateFor("x", 126) }
    ],
    cases: [
      { id: "CASE-107", subject: "Gifting question — sizing for someone else", predictedGrievance: false,
        channelLog: [
          { from: "customer", channel: "chat", text: "If I save a profile for my brother, does the size recommendation update for him specifically?", ts: "2026-08-05T12:00:00" },
          { from: "system", channel: "chat", text: "Thanks — we'll get back to you shortly.", ts: "2026-08-05T12:00:35" },
          { from: "system", channel: "chat", text: "Yes — toggle to his saved profile on your account page and every size recommendation and fit preview switches to his archetype.", ts: "2026-08-05T12:03:00" }
        ] }
    ] },

  { id: "p9", console_id: "cust_009", name: "Sanjay Gupta", brandId: "threadbasics", scenario: 5,
    scenarioLabel: "Brand new shopper — no orders, no Fit Passport yet",
    loyaltyId: null, bridgingStatus: "none", claimStatus: "not-applicable", fitPassport: null,
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: false, proactiveOutreachSent: false,
    orders: [], marketplaceOrders: [], returns: [], cases: [] },

  { id: "p10", console_id: "cust_010", name: "Neha Joshi", brandId: "threadbasics", scenario: 10,
    scenarioLabel: "D2C-native shopper with a complete Fit Passport and a long order history",
    loyaltyId: "SV-10788", bridgingStatus: "not-applicable", claimStatus: "not-applicable",
    fitPassport: { archetypeId: "regular-broad", tier: "full", passportConfidence: 89, completedAt: dateFor("x", 253), consent: { use_for_sizing: true, share_with_advisors: false, include_claimed_marketplace: false } },
    shoppingFor: "myself", secondaryProfile: null, predictedGrievance: false, proactiveOutreachSent: false,
    orders: [
      { id: "SV-ORD-9701", channel: "d2c", date: dateFor("x", 2), status: "Ordered", items: [{ productId: "tb-top", size: "M", qty: 2 }] },
      { id: "SV-ORD-9702", channel: "d2c", date: dateFor("x", 8), status: "Shipped", items: [{ productId: "tb-bottom", size: "M", qty: 1 }] },
      { id: "SV-ORD-9703", channel: "d2c", date: dateFor("x", 21), status: "Delivered", items: [{ productId: "tb-outer", size: "L", qty: 1 }] },
      { id: "SV-ORD-9704", channel: "d2c", date: dateFor("x", 42), status: "Delivered", items: [{ productId: "tb-foot", size: "8", qty: 1 }] },
      { id: "SV-ORD-9705", channel: "d2c", date: dateFor("x", 60), status: "Delivered", items: [{ productId: "tb-dress", size: "L", qty: 1 }] },
      { id: "SV-ORD-9706", channel: "d2c", date: dateFor("x", 80), status: "Delivered", items: [{ productId: "tb-acc", size: "One Size", qty: 3 }] },
      { id: "SV-ORD-9707", channel: "d2c", date: dateFor("x", 98), status: "Delivered", items: [{ productId: "tb-top", size: "M", qty: 1 }] }
    ], marketplaceOrders: [],
    returns: [
      { id: "SV-RET-905", orderId: "SV-ORD-9704", productId: "tb-foot", size: "8", status: "exchanged",
        reason: "size_fit", fitDecoded: { fit_driven: true, zone: "length", direction: "runs_tight" }, step: "exchange-confirm",
        resolvedType: "exchange", exchangeSize: "9", trackingRef: null, newDeliveryDate: dateFor("x", 35), date: dateFor("x", 40) },
      { id: "SV-RET-906", orderId: "SV-ORD-9706", productId: "tb-acc", size: "One Size", status: "requested",
        reason: "other", fitDecoded: null, step: "return-confirm",
        resolvedType: "return", exchangeSize: null, trackingRef: "RET-TRK-338817", pickupPref: "pickup", refundPref: "original", date: dateFor("x", 74) }
    ],
    cases: [
      { id: "CASE-108", subject: "Bulk order confirmation — beanies", predictedGrievance: false,
        channelLog: [
          { from: "customer", channel: "chat", text: "Placed an order for 3 beanies — can you confirm they'll ship together?", ts: "2026-06-02T09:00:00" },
          { from: "system", channel: "chat", text: "Thanks — we'll get back to you shortly.", ts: "2026-06-02T09:00:30" },
          { from: "system", channel: "email", text: "Confirmed — all 3 Cotton Beanies in order SV-ORD-9706 ship together in one package.", ts: "2026-06-02T11:15:00" }
        ] }
    ] }
];

/* ---------------------------- MARKETPLACE ORDER POOL (contract §9/A4) ---------------------------- */
// Anonymous marketplace history: NO name, NO archetype, NO Fit Passport. Keyed by buyer_alias.
// _claimableBy is a demo-only internal field the claim flow uses to simulate a successful
// match; it is never rendered to the user before a successful claim.
const marketplaceOrderPool = [
  { buyer_alias: "MKT-BUYER-7F3A", _claimableBy: "p3", orders: [
    { id: "MKT-7701", channel: "marketplace", date: dateFor("x", 85), status: "Delivered", items: [{ productId: "ue-top", size: "L", qty: 1 }], reasonCode: null },
    { id: "MKT-7702", channel: "marketplace", date: dateFor("x", 65), status: "Delivered", items: [{ productId: "ue-acc", size: "One Size", qty: 1 }], reasonCode: null },
    { id: "MKT-7703", channel: "marketplace", date: dateFor("x", 43), status: "Delivered", items: [{ productId: "ue-foot", size: "8", qty: 1 }], reasonCode: null },
    { id: "MKT-7704", channel: "marketplace", date: dateFor("x", 99), status: "Delivered", items: [{ productId: "ue-bottom", size: "L", qty: 1 }], reasonCode: null }
  ] },
  { buyer_alias: "MKT-BUYER-C19E", _claimableBy: "p5", orders: [
    { id: "MKT-7801", channel: "marketplace", date: dateFor("x", 98), status: "Delivered", items: [{ productId: "ml-acc", size: "One Size", qty: 1 }], reasonCode: null },
    { id: "MKT-7802", channel: "marketplace", date: dateFor("x", 57), status: "Delivered", items: [{ productId: "ml-foot", size: "9", qty: 1 }], reasonCode: null },
    { id: "MKT-7803", channel: "marketplace", date: dateFor("x", 45), status: "Delivered", items: [{ productId: "ml-top", size: "M", qty: 1 }], reasonCode: null },
    { id: "MKT-7804", channel: "marketplace", date: dateFor("x", 120), status: "Delivered", items: [{ productId: "ml-bottom", size: "M", qty: 1 }], reasonCode: null }
  ] }
];

/* ---------------------------- BACKGROUND CUSTOMERS + EMPLOYEES (shared spine completeness) ---------------------------- */
const BG_FIRST = ["Arjun", "Divya", "Kabir", "Sanya", "Rhea", "Manav", "Tara", "Yash", "Nisha", "Farhan", "Ira", "Zoya", "Dev", "Meher-Ansari", "Ayaan", "Pooja", "Rakesh", "Simran", "Vivaan", "Anika", "Kunal", "Lavanya", "Om", "Riya-S", "Tanvi"];
const BG_LAST = ["Bansal", "Chawla", "Dutta", "Ghosh", "Hegde", "Iyer-K", "Jain", "Kulkarni", "Malhotra", "Nair-P", "Oberoi", "Pillai-R", "Qureshi", "Rao-M", "Shetty", "Thomas", "Unni", "Varma-S", "Wadhwa", "Xavier", "Yadav", "Zacharia", "Basu", "Chandra", "Dixit"];
function buildBackgroundCustomers() {
  const list = [];
  const usedNames = new Set(personas.map(p => p.name));
  BRANDS.forEach((brand, bi) => {
    for (let i = 0; i < 5; i++) {
      const idx = bi * 5 + i;
      const rng = rngFor("bgcust", brand.id, i);
      let name;
      do { name = BG_FIRST[idx % BG_FIRST.length] + " " + BG_LAST[(idx * 3 + i) % BG_LAST.length]; idx; } while (usedNames.has(name));
      usedNames.add(name);
      const arch = pick(rng, ARCHETYPES);
      list.push({
        console_id: "cust_bg_" + String(idx + 1).padStart(3, "0"),
        name, brandId: brand.id, archetypeId: arch.id,
        channel: pick(rng, ["d2c", "d2c", "marketplace"]),
        lifetimeOrders: randInt(rng, 1, 9)
      });
    }
  });
  return list;
}
const backgroundCustomers = buildBackgroundCustomers();

const ADVISOR_NAMES = { maisonluxe: "Meher", ecoweave: "Aarav", threadbasics: "Neel" };
const SUB_TEAMS = ["Digital Customer Support", "Marketplace Operations", "CRM & Loyalty", "Customer Analytics", "Customer Journey & Experience Design"];
const EMP_FIRST = ["Karthik", "Neel", "Meher", "Aarav", "Ishita", "Rohan-T", "Sneha", "Varun", "Priyanka", "Aditya", "Gauri", "Nikhil", "Reema", "Shaurya", "Tanya"];
const EMP_LAST = ["Agarwal", "Bhatia", "Chopra", "Desai-K", "Fernandes", "Grover", "Hussain", "Joshi-M", "Kapadia", "Lal", "Mathur", "Naidu", "Prasad", "Reddy-S", "Sinha"];
function buildEmployees() {
  const usedNames = new Set(personas.map(p => p.name));
  usedNames.add("Karan Mehta"); usedNames.add("Ananya Iyer");
  const list = [];
  let seq = 1;
  // named advisors first, guaranteed present
  Object.keys(ADVISOR_NAMES).forEach(brandId => {
    const name = ADVISOR_NAMES[brandId];
    list.push({ id: "emp_" + String(seq++).padStart(3, "0"), name, role: "Style Advisor", subTeam: "Customer Journey & Experience Design", brandId, isNamedAdvisor: true });
  });
  SUB_TEAMS.forEach((team, ti) => {
    for (let i = 0; i < 4; i++) {
      const idx = ti * 4 + i;
      const rng = rngFor("employee", team, i);
      let name;
      do { name = EMP_FIRST[idx % EMP_FIRST.length] + " " + EMP_LAST[(idx * 5 + i) % EMP_LAST.length]; } while (usedNames.has(name));
      usedNames.add(name);
      list.push({ id: "emp_" + String(seq++).padStart(3, "0"), name, role: pick(rng, ["Customer Service Agent", "Marketplace Ops Analyst", "CRM Executive", "Journey Analyst", "Senior CRM/Loyalty Specialist"]), subTeam: team, brandId: null, isNamedAdvisor: false });
    }
  });
  return list;
}
const employees = buildEmployees();

/* ---------------------------- KPI / FUNNEL / GOVERNANCE / WORKFORCE ---------------------------- */
const FUNNEL_DATA = [
  { stage: "Site/app visit", volume: "9.2M sessions", volumeNum: 9200000, advance: "55%", cause: "Intent unknown at entry", feature: "F2 Identity Bridge" },
  { stage: "Product exploration", volume: "5.1M views", volumeNum: 5100000, advance: "19%", cause: "Low purchase confidence, weak personalization", feature: "F6 Confidence badges, F7 Fit Preview, F11 Advisor" },
  { stage: "Add to cart", volume: "966,000", volumeNum: 966000, advance: "57%", cause: "Size/fit uncertainty", feature: "F7 Confidence-weighted size pre-fill" },
  { stage: "Checkout initiated", volume: "552,000", volumeNum: 552000, advance: "42%", cause: "Payment/delivery drop-off", feature: "F8 Cart-level fit check" },
  { stage: "Order completed", volume: "230,000", volumeNum: 230000, advance: "2.5% end-to-end", cause: "—", feature: "F9 Ambient order status" }
];
const FUNNEL_TAIL = { stage: "Returns & service", volume: "48,000 returns · 26,000 contacts · 48-hr resolution", cause: "Disconnected history, repeated information", feature: "F10a Interception, F10b Unified thread" };
const KPI_DATA = [
  { feature: "F6, F7, F11", metric: "Product-view → cart", from: "19%", to: "22%", ambition: "25%", tier: "A / D" },
  { feature: "All", metric: "End-to-end digital conversion", from: "2.5%", to: "2.9%", ambition: "3.2%", tier: "5.1M × 22% × 57% × 42% = 268,607 orders ÷ 9.2M = 2.92% ≥ 2.875% required" },
  { feature: "F8", metric: "Exploration-stage abandonment (100 − view→cart)", from: "81%", to: "78%", ambition: "75%", tier: "Renamed — true cart abandonment tracked separately (76.2%), no commit" },
  { feature: "F7, F3", metric: "First-time fit accuracy (SpeedStyle)", from: "58%", to: "68%", ambition: "75%", tier: "A / D" },
  { feature: "F8, F10a", metric: "SpeedStyle return rate", from: "28%", to: "22.4% blended (21% D2C / 23.5% marketplace)", ambition: "20%", tier: "0.45×21 + 0.55×23.5 = 22.375 ≈ 22.4 = 28×0.8; weights assume SpeedStyle mirrors the 45/55 portfolio split (Tier C)" },
  { feature: "F9, F10b", metric: "Blended resolution time", from: "48 hrs", to: "18 hrs", ambition: "8 hrs (SpeedStyle 72→24 hrs)", tier: "A / D" },
  { feature: "—", metric: "SpeedStyle resolution time", from: "72 hrs", to: "24 hrs", ambition: "10 hrs", tier: "Round 1 Exhibit 2" },
  { feature: "F10a, F10b", metric: "Repeat purchase rate (SpeedStyle)", from: "32%", to: "36%", ambition: "40%", tier: "" },
  { feature: "All", metric: "Average order value", from: "~₹3,195", to: "+8%", ambition: "+15%", tier: "Tier C" },
  { feature: "F10b", metric: "NPS (SpeedStyle)", from: "35", to: "45", ambition: "52", tier: "" },
  { feature: "F2, F3", metric: "Fit Passport opt-in (D2C)", from: "0%", to: ">25% (6-month target)", ambition: "—", tier: "" },
  { feature: "—", metric: "Case Thread / Track Everywhere weekly active use", from: "—", to: ">80% eligible staff", ambition: "—", tier: "" },
  { feature: "—", metric: "Override rate", from: "—", to: "15–30% band", ambition: "—", tier: "" },
  { feature: "—", metric: "Brand Voice first-pass rate", from: "—", to: ">85% by Month 9", ambition: "—", tier: "" }
];
const GOVERNANCE_DATA = [
  { obligation: "Synthetic-content disclosure (Article 50-style)", where: "Watermark badge on every Fit Model render (never on Maison Luxe — no client-facing AI)" },
  { obligation: "SpeedStyle: no implied fit accuracy beyond capability", where: "Empty state instead of a generic preview when no passport exists" },
  { obligation: "UrbanEdge: one-tap human escalation at every AI touchpoint", where: "Persistent \"Talk to a human\" button in Support" },
  { obligation: "Maison Luxe: no client-facing generative content", where: "Component-level substitution across PDP, Support, Style Advisor — no ring, no badge, no watermark, no bot; Meher delivers advisor fit notes and virtual-fitting booking" },
  { obligation: "EcoWeave: zero generative fallback on claims", where: "Verified Claims panel (claim, value, certifier, source doc ID, date) + retrieval/static text only" },
  { obligation: "ThreadBasics: full model-card obligation despite rules engine", where: "Registered in Enterprise Console Module 11" },
  { obligation: "Consent as a first-class field", where: "Fit Passport v2 consent screen with per-field consent_basis; marketplace claim records consent explicitly" },
  { obligation: "Marketplace identity boundary", where: "Marketplace buyers are alias-only until an explicit claim; listing preview uses aggregate SKU data only" },
  { obligation: "DPDP Act 2023 / GDPR residency", where: "Production CDP concern; stated as a prototype delta" }
];
const DELTAS_DATA = [
  { area: "Auth", prototype: "Persona selector", production: "Real accounts, deterministic identity resolution on login" },
  { area: "Archetype assignment", prototype: "Nearest-centroid over 4 measurement bands", production: "K-means/GMM over a measurement space, 8–12 clusters per size band" },
  { area: "Fit rendering", prototype: "Pre-drawn 2D SVG archetypes", production: "Thin-plate-spline or diffusion image-to-image warping on real photography" },
  { area: "Confidence score", prototype: "Deterministic formula", production: "LightGBM/XGBoost propensity model, SHAP statements, weekly retraining" },
  { area: "Return reason", prototype: "Zone + direction decoder, keyword-rule free text", production: "Decoder + fine-tuned text classifier on free-text reasons" },
  { area: "Proactive outreach", prototype: "Static templated message", production: "Anomaly detection over delivery events → RAG-grounded draft → human send" },
  { area: "Support thread", prototype: "Order/return-grounded templates + optional Gemini", production: "RAG-grounded case brief, tiered routing, human-in-the-loop above Tier 1" },
  { area: "Data", prototype: "Shared checksummed JSON seed", production: "Warehouse-native CDP branched off the enterprise thin data spine" },
  { area: "Marketplace order visibility", prototype: "Explicit claim flow (order ID / simulated QR / simulated OTP)", production: "Requires marketplace data-sharing arrangement; text-badge listing preview as Plan B" }
];
const LIMITATIONS_DATA = [
  "Fit Preview renders are stylised and illustrative, not photorealistic — deliberately, per the pilot-feasible rendering tier.",
  "Social-proof rates are computed over seeded fit-feedback events, so they demonstrate the mechanism and its data-volume fallback ladder, not production statistical power.",
  "The marketplace claim flow's QR scan and OTP are simulated; real claiming depends on a negotiated marketplace data-sharing arrangement.",
  "Only three Gemini call sites exist here (fit explanation, style advisor, support) versus more in the Enterprise Console — a deliberate scoping choice, not an architectural limit.",
  "No payment or delivery mechanics: Stage 4 drop-off is largely Order Fulfilment's remit and is flagged as unaddressed rather than force-fitted with a feature.",
  "The live event bus (LIVE_SYNC) and bracketing/store-handoff flags are proposed extensions beyond the solution doc, shipped default-OFF."
];
const CHANGELOG_DATA = [
  { ver: "0.4", change: "Image sourcing moved to self-curated hotlinkable URLs", why: "Removed API-key dependency" },
  { ver: "0.5", change: "Fit Preview upgraded from static illustration to interactive rotating model", why: "Static render read as decoration, not model output" },
  { ver: "0.6", change: "Cart-level fit check (F8) added", why: "Confidence Layer previously stopped at the product page while Stage 3→4 still leaked" },
  { ver: "0.7", change: "Output format changed to a single self-contained HTML file", why: "Submission format requirement" },
  { ver: "1.0", change: "Brand gating moved to component-level substitution", why: "Silently not calling an identical button is not an enforced constraint" },
  { ver: "2.0", change: "Migrated to the SCE shared data spine (checksummed JSON seed shared with the Enterprise Console); fixed 18 correctness/governance bugs; added the marketplace claim lens, Fit Passport v2, Return Reason Decoder and hesitation-triggered nudges", why: "See CHANGELOG_CX_v2.md for the full B/A-id mapping" }
];
const WORKFORCE_CONSTANTS = {
  dcxHeadcount: 540, fteHoursPerMonth: 160, fteEquivalentsAtFullRunRate: 119, targetHoursPerMonth: 19040,
  baselineTimeAllocation: [
    { activity: "Query resolution & grievance", pct: 30 }, { activity: "Segmentation & personalisation", pct: 15 },
    { activity: "Marketplace ops & monitoring", pct: 12 }, { activity: "Journey analytics & reporting", pct: 14 },
    { activity: "Campaign coordination & comms", pct: 11 }, { activity: "CRM & experience design", pct: 18 }
  ],
  routineVsHighValue: { routine: 70, highValue: 30 },
  redeploymentDestinations: ["Customer journey management", "Service recovery", "Marketplace intelligence", "AI-output review", "Personalisation strategy", "Customer relationship development"],
  careerLattice: [
    { from: "Customer Service Agent", to: ["AI Trainer", "Conversation Designer"] },
    { from: "Marketplace Ops Analyst", to: ["Marketplace Intelligence Analyst"] },
    { from: "CRM Executive", to: ["Personalisation Orchestrator"] },
    { from: "Journey Analyst", to: ["Customer Journey Architect"] },
    { from: "Senior CRM/Loyalty Specialist", to: ["Remote Stylist (Advisor-Mediated brands)"] }
  ]
};

/* ---------------------------- BRAND ORDER/RETURN STATS (contract §2, §10 verification) ---------------------------- */
// Simulated at n=4000/brand so the empirical return rate lands within tolerance of the
// contract's seeded_return_rate_target without hand-tuning a number to match it.
function buildBrandOrderStats() {
  const stats = {};
  BRANDS.forEach(brand => {
    const rng = rngFor("brandstats", brand.id);
    const n = 4000;
    let totalReturns = 0, d2cOrders = 0, d2cReturns = 0, mktOrders = 0, mktReturns = 0;
    for (let i = 0; i < n; i++) {
      const isD2c = rng() < 0.45; // portfolio channel mix (Tier C)
      const noise = (rng() - 0.5) * 4; // +/-2pp simulated noise
      const rate = clampNum(brand.seeded_return_rate_target + noise, 1, 60) / 100;
      const returned = rng() < rate;
      if (isD2c) { d2cOrders++; if (returned) d2cReturns++; } else { mktOrders++; if (returned) mktReturns++; }
      if (returned) totalReturns++;
    }
    stats[brand.id] = {
      totalOrders: n, totalReturns,
      returnRatePct: Math.round((totalReturns / n) * 1000) / 10,
      d2cOrders, d2cReturns, d2cReturnRatePct: Math.round((d2cReturns / d2cOrders) * 1000) / 10,
      marketplaceOrders: mktOrders, marketplaceReturns: mktReturns, marketplaceReturnRatePct: Math.round((mktReturns / mktOrders) * 1000) / 10
    };
  });
  return stats;
}
const brandOrderStats = buildBrandOrderStats();

/* ---------------------------- ASSEMBLE + WRITE ---------------------------- */
const seed = {
  version: "2.0", masterSeed: MASTER_SEED, demoToday: DEMO_TODAY,
  categories: CATEGORIES, zonesByCategory: ZONES_BY_CATEGORY, dominantZoneByCategory: DOMINANT_ZONE_BY_CATEGORY,
  apparelSizeRun: APPAREL_SIZE_RUN, footwearSizeRun: FOOTWEAR_SIZE_RUN,
  brands: BRANDS, archetypes: ARCHETYPES, fitMatrix, confidenceAdjustmentLog,
  products, personas, marketplaceOrderPool, backgroundCustomers, employees, advisorNames: ADVISOR_NAMES, brandOrderStats,
  funnelData: FUNNEL_DATA, funnelTail: FUNNEL_TAIL, kpiData: KPI_DATA, governanceData: GOVERNANCE_DATA,
  deltasData: DELTAS_DATA, limitationsData: LIMITATIONS_DATA, changelogData: CHANGELOG_DATA,
  workforceConstants: WORKFORCE_CONSTANTS
};

const json = JSON.stringify(seed);
const checksum = createHash("sha256").update(json).digest("hex");
seed.checksum = checksum;
const finalJson = JSON.stringify(seed, null, 2);

mkdirSync(__dirname, { recursive: true });
writeFileSync(path.join(__dirname, "sce-seed.json"), finalJson, "utf8");
console.log("Wrote shared/sce-seed.json —", finalJson.length, "bytes");
console.log("SHA-256:", checksum);
console.log("Checksum (short, as shown in-app):", checksum.slice(0, 8));
console.log("Products:", products.length, "| Personas:", personas.length, "| Background customers:", backgroundCustomers.length, "| Employees:", employees.length);
