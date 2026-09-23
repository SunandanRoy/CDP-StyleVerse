# StyleVerse Confidence Engine — Enterprise Console v2.0 Changelog

This build adopts `SCE_DATA_CONTRACT.md`'s shared data spine, fixes the 13
named bugs (C1–C13), and adds the 9 new features (D1–D9) from the v2.0
Claude Code prompt. It is a **Console-only build**: no sibling Storefront
project (`PWC_CX_Semi.html`) exists in this workspace, so wherever the
contract or prompt assumes cross-tool parity, this build self-authors a
consistent dataset per the contract's own rules instead — see
`SCE_DATA_CONTRACT.md`'s "Console-only build note" at the top of that file.

## Data spine (Stage 1–1b)

- `shared/generate-seed.mjs` — deterministic seed generator (mulberry32,
  seed `20260922`), producing `shared/sce-seed.json`: 5 brands, 8
  archetypes, 60 products, 35 canonical + background customers, 43
  marketplace-only buyer aliases, 408 orders, 74 returns, 121 reviews, 30
  cases, a fit matrix with 5 hand-tuned overrides, and an `outcomeIndex`
  of aggregate kept/returned statistics.
- `scripts/console-extension.mjs` — a second generator (seed `20260923`)
  producing `shared/console-extension.json`: 21 employees, 24 capacity
  tasks, 85 override-win events, 52 certification-history rows, a
  7-component model registry, and the Dial audit log.
- `shared/sce-lib.mjs` / `shared/contract-constants.mjs` — the single
  source of truth for scoring (`scoreProduct`), sizing
  (`recommendedSize`), social proof, and every brand/archetype/KPI
  constant, imported by both the seed generators and the running app so
  seeded and live-computed figures can never drift apart.

## C1–C13 bug fixes (Stage 3)

| # | Fix |
|---|---|
| C1 | Marketplace-only buyers carry zero identity (no name, archetype, or Fit Passport) — enforced at the data layer, not just the UI. `CustomerList` gets a D2C/Marketplace tab switcher. |
| C2 | Brand-of-record: a case's brand-dependent wording now reads its own `brand_id`, never the header's currently-selected brand. `CaseThreadDetail` shows a "viewing other brand" chip when they differ. |
| C3 | Brand Voice Certification's deterministic rubric is the actual guard beneath every live Gemini call — a model "Pass" can never override a rubric "Fail" (never the reverse). |
| C4 | The standalone build can hold a live Gemini API key (memory-only, never `localStorage`) via a Settings drawer, so static builds aren't limited to canned responses. |
| C5 | Seed realism: `Delivered` orders are always ≥3 days before `DEMO_TODAY`; in-transit delivery-exception orders are the ones that feed Grievance Radar and Case Thread delay scenarios. |
| C6 | Marketplace Signal Engine's labels/counts match what's actually in the data — no static copy that drifts from the seed. |
| C7 | Return Interception's table makes eligibility and "why not intercepted" explicit per row instead of implying every return was considered. |
| C8 | An automation-bias watch flags any registry component whose override rate sits below the 15–30% healthy band (staff rubber-stamping AI output), surfaced on Model Registry. |
| C9 | Capacity Ledger's "released to date" is a monthly run-rate against a monthly target, not a 7-month cumulative sum compared against a monthly figure. |
| C10 | Career Lattice matches the contract's 5-transition list, retiring the stale 6-transition version. |
| C11 | Every date renders through `formatDateIN` (e.g. "25 Sep 2026") — no ambiguous `MM/DD` vs `DD/MM` anywhere. |
| C12 | Sidebar auto-collapses to the icon rail below 900px viewport width, independent of the user's own persisted preference. |
| C13 | Every AI Involvement Dial change requires a reason and writes to a visible audit log (`AIDial.jsx`'s panel, `/api/dial-audit-log`). |

## D1–D9 feature additions (Stage 4)

| # | Feature |
|---|---|
| D1 | **"View as" sub-team switcher** — a top-bar dropdown across the 5 DCX sub-teams filters the sidebar to that team's own modules and swaps the Dashboard link for a role-scoped **Today** home (`TeamToday.jsx`) showing its Automate/Augment/Amplify capacity split. |
| D2 | **Advisor Workspace** — for Advisor-Mediated brands (Maison Luxe, EcoWeave): client book → AI brief + suggested looks → sign-off → advisor edit → Brand Voice Certification → send, with a side-by-side internal/client preview. A materially-edited draft logs a new Override Wins entry. Adds a 5th Gemini call site, `advisor-brief`. |
| D3 | **Grievance Radar** — scores open cases for grievance risk (delivery exceptions, days open, escalation) against each brand's Dial `proactivity_threshold`; an AI-drafted outreach and "mark sent" turns a case `proactive`. Priya Nair's delivery-exception scenario is guaranteed in the seed (previously left to random sampling — a real gap this stage found and fixed) so she reliably appears here. |
| D4 | **Closed feedback loop** — a SKU hot-list by return rate × archetype × zone; "Propose adjustment" → Customer Analytics approval (reason required) mutates the live fit matrix and appends to `confidence_adjustment_log` in the same step, so the Confidence Layer recomputes on its very next call. "Send to Merchandising & Design" downloads CSV and logs to the existing signal-insights feed. |
| D5 | **Marketplace data boundary in the Signal Engine** — an explicit channel-capability matrix, SKU-level aggregate marketplace reason codes (never individual buyer data), a bridge funnel (alias → claim pending → approved, +250 loyalty points), and a Plan-B text sizing-badge generator for listings that can't host the interactive Fit Model. |
| D6 | **Confidence calibration** — a reliability chart (predicted decile vs. observed kept rate) and an exact Brier score, computed from the same `outcomeIndex` data the score itself reads. Shown on Confidence Layer (brand-scoped) and Model Registry's Confidence Score Model card (all brands). |
| D7 | **Dashboard v2** — a revenue funnel decomposing the End-to-end Conversion KPI's existing arithmetic (5.1M × 22% × 57% × 42% = 268,607 orders ÷ 9.2M = 2.92%) into stages; live return rate vs. commitment with supporting case references; the Exhibit 2 70/30 time-allocation split cross-checked against the Capacity Ledger's actual released hours. |
| D8 | **Customer 360 v2** — consent tags per data category (explicit opt-in vs. contractual necessity), an Identity Graph (D2C profile → loyalty account → marketplace alias, with bridge status). "Open storefront as this customer" is explicitly marked N/A — no Storefront file exists in this Console-only build. |
| D9 | **Optional live event bus stub** — a `LIVE_SYNC` flag (default off) in the Settings drawer that, when enabled, listens across browser tabs for `localStorage["sce_event_bus_v1"]` writes. No Storefront producer exists in this workspace, so it is a real, working listener with nothing to listen to — documented as a stub, not faked. |

## Known scope limits (Console-only build)

- No cross-tool checksum matching, `?persona=` deep links into a
  Storefront file, or literal Storefront-authored content — everywhere
  the contract says "both tools," this build treats it as N/A.
- The event bus (D9) and the "open storefront as this customer" link
  (D8) are both stubs for the same reason: there is no second tool to
  connect to in this workspace.
