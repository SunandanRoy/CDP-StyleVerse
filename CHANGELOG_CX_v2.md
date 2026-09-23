# StyleVerse Consumer Storefront — v2.0 Changelog

Maps every ID in the v2 engineering prompt to what changed in `PWC_CX_Semi.html` and how it was verified. Dev-only document — not part of the submitted artifact.

## §1 Shared data spine

- Added `shared/generate-seed.mjs` (Node ≥18, zero deps, `mulberry32` seeded `20260922`, `DEMO_TODAY = "2026-09-25"`), writing `shared/sce-seed.json` + a SHA-256 checksum, and exporting the pure helpers `scoreProduct`, `recommendedSize`, `socialProof`, `computeReturnRate`, `formatDateIN` inside a verbatim-extractable marker block.
- Added `scripts/inline-seed.mjs`, which inlines the seed JSON + helper source between `/* === SCE SHARED SEED v2 (do not hand-edit) === */` markers in the HTML.
- `PWC_CX_Semi.html` now reads brands, archetypes, fit matrix, products, personas, marketplace order pool, KPI/impact data and the confidence-adjustment log from `SCE_SEED` via thin delegating wrappers, instead of hardcoded arrays and a hashed scoring formula.
- The Prototype Console and About page both display `Dataset: <checksum-8>`.
- Verified: `node shared/generate-seed.mjs && node scripts/inline-seed.mjs PWC_CX_Semi.html` regenerates deterministically; `node --check` on the extracted `<script>` passes; jsdom regression across all 10 personas is clean.

## §2 Bugs

| ID | Fix | Verified |
|---|---|---|
| B1 | Marketplace orders never reach `startReturnFlow` (which only understood D2C orders and threw). Every line item gets its own "Start a Return" entry point; marketplace items route to the new Marketplace Return Handoff (A4b). | jsdom: starting a return on a claimed marketplace order (Ishaan Kapoor) opens the handoff screen with zero exceptions. |
| B2 | `recommendedSize` replaced with a real calculation: archetype base size + dominant-zone direction, clamped to the run — no hashing. The cart/checkout interstitial never offers the size already selected. | jsdom: recommended sizes are deterministic and archetype-appropriate across all fit-applicable SKUs. |
| B3 | A cart line is flagged when selected size != recommended size OR tier is low (fit-applicable only), recomputed fresh on every render — including the cart screen itself, not just at checkout — so changing size in cart re-checks immediately. | jsdom: inline cart warning updates live on a size change. |
| B4 | Accessories are `fit_applicable:false` / "One Size" end-to-end in the seed: no score, ring, badge, fit preview, or entry in the confidence filter. | jsdom: all accessory SKUs render no badge/ring and "One Size" only. |
| B5 | Maison Luxe (identified via `ai_tooling_mode === "internal_llm_only"`, not a brand.id check) never renders a score, ring, AI badge or watermark. PDP shows an "Advisor fit note" signed by Meher plus a virtual-fitting booking flow instead. | jsdom: across all 12 Maison Luxe SKUs, no `.confidence-ring`, `.ai-badge`, `.ai-watermark`, `/\d+%\s*confidence/i` match, or bare "AI" text. |
| B6 | EcoWeave PDPs show a Verified Claims panel (claim, value, certifier, source doc ID, date, "illustrative") sourced from the seed; the value prop was replaced with a verifiable one. | Manual/jsdom render check on EcoWeave SKUs. |
| B7 | Removed the `proactiveOutreachSent = true` mutation inside `renderHomeScreen` (render functions must be pure). The banner now persists until the user clicks View Details. | jsdom: banner survives a wishlist toggle (Priya Nair). |
| B8 | Replaced the rule-based height×fit-preference lookup (Tall+Relaxed → Plus/Relaxed, contradicting "Tall") with `nearestCentroidArchetype`, a real nearest-centroid match over height/bust/waist/hip bands. "Someone else" is chosen before any measurement step and only ever writes `secondaryProfile` — the user's own `fitPassport` is never touched or invented. | jsdom: Tall+Relaxed now resolves to Tall/Broad-shoulder; choosing "someone else" for a passport-less persona leaves `fitPassport === null`. |
| B9 | Replaced the loyalty-number bridge modal (no close button, `data-action="noop"` on the overlay) with the Claim Marketplace Orders flow (A4a): closable via close button, Esc and overlay click. | jsdom: full claim flow completes; Esc/overlay-click paths wired via `handleAppKeydown`/overlay `data-action`. |
| B10 | Ananya Iyer's CASE-102 text corrected to match her return's real, unresolved `exchange-offer` step (was falsely claiming the exchange was "confirmed and on its way"). | Seed-level fix, verified by reading the generated `sce-seed.json`. |
| B11 | "Picked for you" / PDP cross-sell now rank by confidence for the active profile and exclude already-owned items; Maison Luxe shows a curated, score-free rail signed by Meher. | jsdom render check. |
| B12 | Product copy now comes from per-category/brand text in the seed; the brand tagline is no longer appended to product descriptions. | Seed + render check (no "designed for everyday wear" on the evening gown). |
| B13 | Unlinked/claim-in-progress shoppers see an honest teaser on Track Everywhere ("we can't see those orders until you claim them") instead of a bare "No orders yet". | jsdom render check (Karan Mehta). |
| B14 | Added a `GEMINI_MODEL` constant (`gemini-2.5-flash`, with a comment to verify before a live demo). Prompts now carry zone directions, recommended size and size-level social proof (rate + n); outputs are validated (≤30 words, no digit not present in the input) before being shown, else the labelled `(example response)` fallback. | Code review of `buildFitPromptContext`/`validateAiOutput`; offline runs always hit the fallback path, which is exercised by every jsdom run. |
| B15 | Every clickable `data-action` element that isn't already a real `<button>`/`<a>`/form control gets `role="button"` + `tabindex="0"` programmatically after each render (`enhanceInteractiveDivs`), with one delegated keydown handler activating Enter/Space. Toast host is `aria-live="polite"`. Fit Model auto-rotate and the home count-up now check `prefers-reduced-motion`. | Code review; jsdom regression confirms no runtime errors from the added keydown handling. |
| B16 | Added `html,body{overflow-x:hidden}` — traced the 15px `document.documentElement.scrollWidth` excess to a root-scrollbar measurement quirk (no single element's own bounding box exceeded the viewport in a full DOM scan). Tables already scroll inside their own `.table-wrap`. | Playwright at 390px: `scrollWidth === clientWidth` on home, catalog, track, returns, account, support, wishlist, cart. |
| B17 | `fmtDate` now delegates to the shared `formatDateIN` helper everywhere. | Code review of all `fmtDate` call sites. |
| B18 | The offline/broken-image fallback is a category-specific garment illustration (tee, trousers, jacket, shoe, dress, tote) drawn in code and tinted by the brand accent, replacing the flat "StyleVerse / Category" text card. | Visual/jsdom check of `placeholderDataUri`. |

## §3 Additions

| ID | What shipped |
|---|---|
| A1 | Session hesitation tracking (size toggles, size-guide opens, 25s dwell, add-then-remove-from-cart, returning to the same PDP twice) into a weighted score capped at 60. Crossing the brand's `hesitation_nudge_threshold` shows exactly one brand-gated nudge; the displayed score never changes mid-session. Prototype Console gains a live Event Stream panel. |
| A2 | "Why this score?" is a three-bar contribution breakdown + zone chips from the live fit matrix + size-specific social proof with its data-volume fallback level labelled, for every brand except the advisor-fronted one; SpeedStyle/UrbanEdge can add one Gemini sentence on top. |
| A3 | Fit Passport v2: consent screen (required/optional, per-field), Quick estimate (basic) vs Precise fit (full, real measurements → nearest-centroid + higher confidence) tiers, Edit/Download JSON/Delete on Account. |
| A4a | Claim Marketplace Orders: order ID or simulated QR scan → simulated OTP → merge + Fit Passport pre-seed + 250 loyalty points (Tier D, illustrative). |
| A4b | Marketplace Return Handoff: explains the marketplace processes its own return; optional two-tap zone+direction feedback feeds the closed-loop fit_signal log. |
| A4c | Mock marketplace listing preview in the Prototype Console with the Plan-B text sizing badge, generated from aggregate SKU data only. |
| A5 | Return Reason Decoder: zone + direction picker → decoded `{fit_driven, zone, direction}` chip; value threshold (Maison Luxe or >₹10,000) routes to human confirmation; no-passport returns decline interception (`below_confidence_threshold`); unavailable sizes fall back to `out_of_stock`; "changed my mind"/"quality issue"/"other" skip the decoder entirely. |
| A6 | Support replies are grounded in the persona's actual orders/returns; UrbanEdge's "Talk to a human" is a real hand-off to a named Digital Customer Support employee; multi-case personas get a case switcher. |
| A7 | Courier/last-scan/ETA on in-flight D2C shipments; exchange/return shipments render as child rows; marketplace rows carry a "status from marketplace feed" badge; delivery_exception links to Support. |
| A8 | Impact Dashboard funnel calculator (19–25% view→cart slider, ≥2.875% requirement marker) and return-rate blend calculator (D2C/marketplace rate + split sliders vs the 22.4% target), both reproducing the contract's own worked examples at default values. |
| A9 | Prototype Console links to `PWC_CDP_Semi.html#/customers/<console_id>`; the Storefront accepts an inbound `?persona=p1` / `#persona=p1` deep link. |
| A10 | `LIVE_SYNC` flag (default OFF): appends `order_placed`/`return_submitted`/`fit_signal`/`orders_claimed` to `localStorage["sce_event_bus_v1"]`. |
| A11 | `BRACKETING_CHECK` / `STORE_HANDOFF` flags (default OFF): same-SKU-multiple-sizes nudge and a store reservation stub. |

## Known simplifications (honest, not hidden)

- A7's courier/last-scan/ETA fields are presentation-layer, deterministic-but-illustrative trim (not stored in the seed) — labelled as such in this changelog, not claimed as case data.
- A6's Gemini-grounded support replies fall back to the templated grounded reply whenever no API key is set (i.e. in every offline/CI run) — this is the same fallback discipline used throughout the prototype (B14).
- The Enterprise Console (`PWC_CDP_Semi.html`) referenced by A9's cross-tool links is out of scope for this prompt and does not exist in this repository; the links are wired correctly but will 404 until that companion prompt is run.
