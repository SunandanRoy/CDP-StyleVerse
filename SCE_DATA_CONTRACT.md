# SCE Shared Data Spine Contract — v2.0

Place this file at the root of BOTH project folders (Consumer Storefront and Enterprise Console) as `SCE_DATA_CONTRACT.md`. Both Claude Code prompts read it before touching code. It is the single source of truth for every entity, number and label that appears in both prototypes.

## 0. Why this exists

The two prototypes currently describe different worlds: different customers (CX: Rohan Verma, Ananya Iyer… / Console: Rohan Kapoor, Riya Bhatt…), different SKUs and prices (CX Maison Luxe gown ₹8,999 / Console Maison Luxe trouser ₹45,760), different archetype sets (8 vs 10), different career lattices, and computed brand return rates that contradict the case (Console shows Maison Luxe at 32.4%; case says ~9%). The pitch is "one engine, five brands"; the data must prove it.

## 1. Generator and determinism

- Canonical generator: `shared/generate-seed.mjs` (Node ≥18, zero dependencies) writes `shared/sce-seed.json` and prints a SHA-256 checksum of the JSON.
- PRNG: mulberry32, fixed seed `20260922`. No `Math.random()` anywhere in seeded data.
- `DEMO_TODAY = "2026-09-25"` — one exported constant. All seeded dates are computed relative to it. Runtime-created records (new orders/returns in the storefront) may use the real clock.
- **Submission format: each prototype is ONE standalone HTML file** — `PWC_CX_Semi.html` (Storefront) and `PWC_CDP_Semi.html` (Console). Everything else (`shared/`, `scripts/`, `tests/`, changelogs) is development scaffolding and is NOT submitted. The HTML files must not reference any local file at runtime: no `<script src="./…">`, no `<link href="./…">`, no `fetch()` of local JSON.
- Both HTML files INLINE the identical JSON and helper source between the markers `/* === SCE SHARED SEED v2 (do not hand-edit) === */` and `/* === END SCE SHARED SEED === */`, written by `scripts/inline-seed.mjs`. Both display the checksum (first 8 chars) in their reviewer/about area so a judge can see it is the same dataset.
- The generator also exports pure functions used by both tools (inlined verbatim into both files): `scoreProduct`, `recommendedSize`, `socialProof`, `computeReturnRate`, `formatDateIN`.
- Allowed external requests at runtime (both files): Gemini API when a key is pasted, product images with an inline SVG fallback, Google Fonts with a system-font fallback stack. With the network off, both files must still open and every screen must work.
- Cross-tool links are relative (`PWC_CDP_Semi.html#/customers/cust_001`, `PWC_CX_Semi.html?persona=p1`) and work when both files sit in the same folder. Do not rename the files.

## 2. Brands (5)

| id | name | posture | disclosure_mode | ai_tooling_mode | client_facing_generative | escalation_visible | seeded return-rate target | price band (₹, Tier C) |
|---|---|---|---|---|---|---|---|---|
| speedstyle | SpeedStyle | Automate-heavy | Self-Directed | full_llm | true | false | 28% (case) | 499–2,999 |
| urbanedge | UrbanEdge | Balanced | Self-Directed | full_llm | true | true | ~21% (Tier C) | 1,299–4,999 |
| maisonluxe | Maison Luxe | Amplify-dominant | Advisor-Mediated | internal_llm_only | false | n/a (human-fronted) | ~9% (case) | 12,000–48,000 |
| ecoweave | EcoWeave | Augment-led | Advisor-Mediated (per solution doc §3/§4 — team to confirm) | retrieval_only | false | false | ~16% (Tier C) | 1,999–6,999 |
| threadbasics | ThreadBasics | Rules-engine automate | Self-Directed | rules_engine_only | false | false | ~19% (Tier C) | 299–1,799 |

Keep existing hard-limit strings, taglines, accents and fonts. Benchmarks shown on the Console dashboard (NPS, monthly queries, resolution hrs, top query type) are labelled "Round 1 Exhibit 2 benchmark (reference)", never "seeded case data". Seeded return rates must land within ±3 pp of target; Exhibit 1 portfolio figure is 21% of orders returned (48,000 / 230,000 = 20.9%).

## 3. Archetypes (8) — Storefront geometry is canonical

| id | label | height (cm) | bust / waist / hip (in) | base apparel size | base footwear (UK) |
|---|---|---|---|---|---|
| petite-slim | Petite/Slim | 147–157 | 30–32 / 24–26 / 33–35 | S | 5 |
| petite-curvy | Petite/Curvy | 147–160 | 34–37 / 28–31 / 38–41 | M | 5 |
| regular-athletic | Regular/Athletic | 160–170 | 34–36 / 27–29 / 35–37 | M | 7 |
| curvy-regular | Curvy/Regular | 160–170 | 37–40 / 30–32 / 40–43 | L | 7 |
| regular-broad | Regular/Broad | 162–173 | 38–41 / 31–34 / 37–39 | L | 8 |
| tall-slim | Tall/Slim | 173–188 | 33–35 / 26–28 / 35–37 | M | 9 |
| tall-broad | Tall/Broad-shoulder | 173–183 | 40–43 / 32–35 / 39–41 | L | 9 |
| plus-relaxed | Plus/Relaxed-fit | 163–175 | 44–48 / 38–42 / 46–50 | XL | 8 |

The Console's 10-archetype list is retired. Archetype assignment in the prototype = nearest centroid over (height, bust, waist, hip, usual size); production = K-means/GMM (solution doc §7.3).

## 4. Sizes and fit zones

- Apparel size run: XS, S, M, L, XL, XXL. Footwear: UK 4–11. Accessories: "One Size" with `fit_applicable: false` (no confidence score, no fit preview, no fit-check flag, no fit-driven return reason).
- Three zones per category, mapped to the fit model's upper/mid/lower anchors:
  - Tops, Outerwear: shoulders / chest / length
  - Bottoms: waist / hip / inseam
  - Dresses: bust / waist / length
  - Footwear: length / width (markers at the feet)
- Dominant zone (drives size shift): Tops/Outerwear → shoulders; Bottoms → waist; Dresses → bust; Footwear → length.

## 5. Fit matrix

`fit_matrix[category][archetype][zone] ∈ {true_to_size, runs_tight, runs_loose}`, prior ≈ 60% / 25% / 15%. Every zone must vary by BOTH category and archetype (the current Storefront seed `(ci*3 + ai*5 + 1) % 3` ignores category for shoulders because ci*3 ≡ 0 mod 3 — do not reproduce). Retain the five hand-tuned overrides and their `confidence_adjustment_log` entries, renaming Footwear "waist" to "width". At least one log entry's `new_value` must equal the live matrix value (verifiable, not decorative).

## 6. Scoring (one pure function, both tools)

```
off_zones      = count of zones != true_to_size for (category, archetype)
fit_match_pct  = archetype ? clamp(product.base_fit_pct − 7·off_zones, 0, 100)
                           : clamp(product.base_fit_pct − 10, 0, 100)        // no passport = more uncertainty
social         = socialProof(product, archetype, recommendedSize)          // returns {rate, n, level}
                 level = "size" if n ≥ 20 for (product, archetype, size);
                         else "archetype" if n ≥ 20; else "product"
hesitation     = product.sku_hesitation_index   // 0–60, SKU-level aggregate, seeded; same in both tools
confidence     = round(0.5·fit_match_pct + 0.3·social.rate + 0.2·(100 − hesitation))
tier           = ≥80 high | 60–79 medium | <60 low
contributions  = {fit: 0.5·fit_match_pct, social: 0.3·social.rate, friction: 0.2·(100 − hesitation)}
```

Session-level hesitation signals in the Storefront (size toggles, size-guide opens, dwell, add→remove) TRIGGER interventions; they do not change the displayed score mid-session.

`recommendedSize(product, archetype)`: start at the archetype's base size; +1 step if the dominant zone is `runs_tight`, −1 if `runs_loose`; clamp to the run. Accessories → "One Size". No hashing.

## 7. Products — 60 (12 per brand, 2 per category)

Keep every existing Storefront product name as the first SKU of its pair; add a brand-appropriate second. Prices inside the brand band. `base_fit_pct` 60–92. `sku_hesitation_index` 10–55. EcoWeave SKUs carry `verified_claims: [{claim, value, source_doc_id, certifier, verified_on}]`, each marked "illustrative". Product copy is generated per category and brand (no "designed for everyday wear" on an evening gown; do not append the tagline to product copy).

## 8. Fit feedback, orders, returns

- 150–300 kept/returned outcome events per product; archetype mix weighted realistically. Kept probability rises with fit_match and falls ~25 pp when purchased size ≠ recommended size.
- Ordered sizes stay within ±1 of the archetype's recommended size, except explicitly flagged wrong-size scenario records.
- Status must agree with dates: Delivered ≥ 3 days before DEMO_TODAY; "In Transit" ≤ 7 days old unless `delivery_exception: true` (these feed the Grievance Radar and at least one belongs to canonical persona Priya Nair).
- Returns: D2C carries free-text reason + decoded {category, zone, direction}; Marketplace carries only a reason code: `size_fit | defective | not_as_described | no_longer_needed | other`.
- Interception applies to fit-driven D2C returns only; each non-intercepted fit return states why: `out_of_stock | below_confidence_threshold | above_value_threshold_routed_to_human`.

## 9. People

- Canonical named customers: the 10 Storefront personas (keep names, loyalty IDs, archetypes and scenarios) with `console_id` cust_001–cust_010. Add 5 background customers per brand (25) for Console volume. D2C-only customers show linkage "Not applicable (D2C-native)", never "Not yet bridged".
- Marketplace-only buyers: NO name, NO archetype, NO Fit Passport. Keyed by `buyer_alias` (e.g. `MKT-BUYER-7F3A`) with order-level data only. Karan Mehta (persona p3) is a named D2C account; his four marketplace orders exist in the Console only under his alias until he claims them.
- Employees belong to exactly the case's five sub-teams: Digital Customer Support, Marketplace Operations, CRM & Loyalty, Customer Analytics, Customer Journey & Experience Design.
- Named advisors: Maison Luxe "Meher" (replaces "Priya", which collides with customer Priya Nair); EcoWeave "Aarav". No employee shares a name with any customer (current collisions: "Ananya Iyer", "Karan Mehta", "Priya").
- Case message logs come from coherent templates per case type (size exchange, delivery delay, refund status, sourcing question, alteration request); every message must follow logically from the one before.

## 10. KPI table (both tools render from this constant)

| KPI | Baseline | Commit | Ambition | Tier / note |
|---|---|---|---|---|
| Product-view → cart | 19% | 22% | 25% | A / D |
| End-to-end conversion | 2.5% | 2.9% | 3.2% | 5.1M × 22% × 57% × 42% = 268,607 orders ÷ 9.2M = 2.92% ≥ 2.875% required |
| Exploration-stage abandonment (100 − view→cart) | 81% | 78% | 75% | Renamed — see §12 |
| First-time fit accuracy (SpeedStyle) | 58% | 68% | 75% | A / D |
| SpeedStyle return rate | 28% | 22.4% blended (21% D2C / 23.5% marketplace) | 20% | 0.45×21 + 0.55×23.5 = 22.375 ≈ 22.4 = 28 × 0.8; weights assume SpeedStyle's channel mix mirrors the 45/55 portfolio split (Tier C) |
| Blended resolution time | 48 hrs | 18 hrs | 8 hrs | A / D |
| SpeedStyle resolution time | 72 hrs | 24 hrs | 10 hrs | Round 1 Exhibit 2 |
| Repeat purchase (SpeedStyle) | 32% | 36% | 40% | |
| Average order value | ~₹3,195 | +8% | +15% | Tier C |
| NPS (SpeedStyle) | 35 | 45 | 52 | |
| Fit Passport opt-in (D2C) | — | >25% in 6 months | — | |
| Case Thread / Track Everywhere weekly active use | — | >80% eligible staff | — | |
| Override rate | — | 15–30% band | — | |
| Brand Voice first-pass rate | — | >85% by Month 9 | — | |

## 11. Workforce constants

- DCX headcount 540 (case). FTE conversion 160 hrs/month (Tier C, displayed wherever hours convert to FTE). ≈119 FTE-equivalents released at full run-rate ⇒ ≈19,040 hrs/month target. Ledgers show "released to date" against this target; they never present a partial sample as the total.
- Exhibit 2 baseline time allocation: Query resolution & grievance 30%, Segmentation & personalisation 15%, Marketplace ops & monitoring 12%, Journey analytics & reporting 14%, Campaign coordination & comms 11%, CRM & experience design 18% (70% routine / 30% high-value).
- Redeployment destinations = the case's six higher-value activities: customer journey management, service recovery, marketplace intelligence, AI-output review, personalisation strategy, customer relationship development.
- Career lattice = solution doc §10.2: Customer Service Agent → AI Trainer / Conversation Designer; Marketplace Ops Analyst → Marketplace Intelligence Analyst; CRM Executive → Personalisation Orchestrator; Journey Analyst → Customer Journey Architect; Senior CRM/Loyalty Specialist → Remote Stylist (Advisor-Mediated brands).

## 12. Open decisions (defaults applied; the team can override before running)

1. EcoWeave disclosure mode — default Advisor-Mediated (solution doc §3/§4).
2. "Cart abandonment" — the doc's 81% is 100 − view→cart, which is exploration-stage abandonment. True cart abandonment is 1 − 230,000/966,000 = 76.2%. Default: rename to "Exploration-stage abandonment" and track true cart abandonment (76.2%) without a commit.
3. Bridge incentive — default +250 loyalty points per claimed marketplace order batch (Tier D, illustrative).
4. Bracketing detection and online-to-store handoff — new mechanisms, not in the solution doc; built behind feature flags, default OFF.
