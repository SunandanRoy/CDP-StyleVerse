#!/usr/bin/env node
// StyleVerse Consumer Storefront v2 — verification suite (SCE_DATA_CONTRACT.md §5).
//
// Written against playwright-core driving a pre-installed Chromium, rather than the
// @playwright/test runner, to match this environment's sandboxed setup (no network access
// for `npx playwright install`). Run with: node tests/cx.spec.mjs
//
// Dev-only tooling — not part of the submitted PWC_CX_Semi.html artifact.

import { chromium } from "playwright-core";
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HTML_PATH = path.join(ROOT, "PWC_CX_Semi.html");
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FILE_URL = "file://" + HTML_PATH;

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail: detail || "" });
  console.log((pass ? "PASS" : "FAIL") + " — " + name + (detail ? " (" + detail + ")" : ""));
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Network resource failures (offline image hosts, blocked fonts) log as browser console
// errors regardless of the app's own graceful onerror fallback — they are not app bugs, so
// they're filtered out here the same way this project's jsdom smoke tests only ever treat
// uncaught JS exceptions (window.onerror) as failures, never resource-load noise.
const RESOURCE_ERROR_RE = /Failed to load resource|net::ERR_|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/;
async function newPageWithErrorCapture(browser, url, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => {
    if (msg.type() === "error" && !RESOURCE_ERROR_RE.test(msg.text())) errors.push(msg.text());
  });
  await page.goto(url);
  await page.waitForTimeout(300);
  return { page, errors };
}
async function exposeState(page) {
  await page.evaluate(() => {
    window.__t = {
      state, personas, products, ARCHETYPES, BRANDS, fitMatrix, brandOrderStats, SCE_CHECKSUM,
      getBrand, getArchetype, getProduct, recSizeFor: (typeof recSizeFor !== "undefined" ? recSizeFor : null),
      confidenceScore, isAdvisorFronted
    };
  });
}

async function test1_allPersonasAllScreens(browser) {
  const { page, errors } = await newPageWithErrorCapture(browser, FILE_URL);
  const screens = ["go-home", "go-catalog", "go-track", "go-returns", "go-account", "go-support", "go-wishlist", "go-cart"];
  for (const p of ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10"]) {
    await page.evaluate((id) => { window.selectPersona(id); }, p);
    await page.waitForTimeout(150);
    for (const s of screens) {
      await page.evaluate((action) => {
        document.querySelector('[data-action="' + action + '"]')?.click();
      }, s);
      await page.waitForTimeout(80);
    }
  }
  await page.close();
  record("1. Every persona x every screen renders with zero console errors", errors.length === 0, errors.length + " errors");
}

async function test2_b1_marketplaceReturnNoException(browser) {
  const { page, errors } = await newPageWithErrorCapture(browser, FILE_URL);
  await page.click('[data-action="select-persona"][data-id="p6"]');
  await page.waitForTimeout(150);
  await exposeState(page);
  const outcome = await page.evaluate(() => {
    const p = window.__t.state.currentPersona;
    const order = p.marketplaceOrders.find(o => o.status === "Delivered");
    try {
      window.startMarketplaceReturn(order.id, order.items[0].productId);
      return { ok: true, screen: window.__t.state.screen };
    } catch (e) { return { ok: false, msg: e.message }; }
  });
  await page.close();
  record("2. B1 marketplace return opens handoff, no exception", outcome.ok && outcome.screen === "marketplace-return-handoff", JSON.stringify(outcome));
}

async function test3_b2b3_recommendedSizeAndFlagging(browser) {
  const { page } = await newPageWithErrorCapture(browser, FILE_URL);
  await page.click('[data-action="select-persona"][data-id="p1"]');
  await page.waitForTimeout(150);
  await exposeState(page);
  const outcome = await page.evaluate(() => {
    const t = window.__t;
    const applicable = t.products.filter(p => p.fit_applicable);
    let checked = 0, violations = [];
    t.ARCHETYPES.forEach(a => {
      applicable.forEach(p => {
        const rec = t.recSizeFor(p, a.id);
        const run = p.category === "Footwear" ? ["4","5","6","7","8","9","10","11"] : ["XS","S","M","L","XL","XXL"];
        const base = p.category === "Footwear" ? String(a.base_footwear_uk) : a.base_apparel_size;
        const baseIdx = run.indexOf(base) === -1 ? Math.floor(run.length/2) : run.indexOf(base);
        const recIdx = run.indexOf(rec);
        if (Math.abs(recIdx - baseIdx) > 1) violations.push(p.id + "/" + a.id);
        checked++;
      });
    });
    return { checked, violations: violations.slice(0, 5), violationCount: violations.length };
  });
  await page.close();
  record("3. B2 recommendedSize within one step of archetype base (" + outcome.checked + " checks)", outcome.violationCount === 0, outcome.violationCount + " violations e.g. " + outcome.violations.join(","));
}

async function test4_b4_accessoriesNoScore(browser) {
  const { page } = await newPageWithErrorCapture(browser, FILE_URL);
  await page.click('[data-action="select-persona"][data-id="p1"]');
  await page.waitForTimeout(150);
  await exposeState(page);
  const outcome = await page.evaluate(() => {
    const t = window.__t;
    const accessories = t.products.filter(p => p.category === "Accessories");
    const bad = accessories.filter(p => p.fit_applicable !== false || p.base_fit_pct !== null);
    return { total: accessories.length, bad: bad.length };
  });
  // also render one accessory PDP and check DOM
  await page.evaluate(() => { window.openProduct(window.__t.products.find(p => p.category === "Accessories").id); });
  await page.waitForTimeout(150);
  const domCheck = await page.evaluate(() => {
    const html = document.getElementById("app").innerHTML;
    return { hasRing: html.includes("confidence-ring"), hasOneSize: html.includes("One Size") };
  });
  await page.close();
  const pass = outcome.bad === 0 && !domCheck.hasRing && domCheck.hasOneSize;
  record("4. B4 no accessory renders a score/ring, size is One Size", pass, JSON.stringify({ outcome, domCheck }));
}

async function test5_b5_maisonLuxeClean(browser) {
  const { page } = await newPageWithErrorCapture(browser, FILE_URL);
  await page.click('[data-action="select-persona"][data-id="p6"]');
  await page.waitForTimeout(150);
  await exposeState(page);
  const productIds = await page.evaluate(() => window.__t.products.filter(p => p.brandId === "maisonluxe").map(p => p.id));
  let allClean = true, failures = [];
  for (const id of productIds) {
    await page.evaluate((pid) => { window.openProduct(pid); }, id);
    await page.waitForTimeout(60);
    const bad = await page.evaluate(() => {
      const html = document.getElementById("app").innerHTML;
      const text = html.replace(/<[^>]+>/g, " ");
      return html.includes("confidence-ring") || html.includes("ai-badge") || html.includes("ai-watermark")
        || /\d+%\s*(fit\s*)?confidence/i.test(html) || /\bAI\b/.test(text);
    });
    if (bad) { allClean = false; failures.push(id); }
  }
  await page.close();
  record("5. B5 no Maison Luxe screen shows score/ring/AI text (" + productIds.length + " SKUs)", allClean, failures.join(","));
}

async function test6_b7_bannerSurvivesWishlistToggle(browser) {
  const { page } = await newPageWithErrorCapture(browser, FILE_URL);
  await page.click('[data-action="select-persona"][data-id="p4"]'); // Priya Nair, predictedGrievance
  await page.waitForTimeout(150);
  await exposeState(page);
  const before = await page.evaluate(() => document.getElementById("app").innerHTML.includes("possible delay"));
  await page.evaluate(() => {
    const p = window.__t.products.find(pr => pr.brandId === window.__t.state.currentPersona.brandId);
    window.toggleWishlist(p.id);
  });
  await page.waitForTimeout(80);
  const after = await page.evaluate(() => document.getElementById("app").innerHTML.includes("possible delay"));
  await page.close();
  record("6. B7 home banner survives a wishlist toggle", before && after, "before=" + before + " after=" + after);
}

async function test7_a1_hesitationNudge(browser) {
  const { page } = await newPageWithErrorCapture(browser, FILE_URL);
  await page.click('[data-action="select-persona"][data-id="p1"]'); // SpeedStyle
  await page.waitForTimeout(150);
  await exposeState(page);
  const outcome = await page.evaluate(() => {
    const t = window.__t;
    const prod = t.products.find(p => p.brandId === "speedstyle" && p.fit_applicable);
    window.openProduct(prod.id);
    const archId = t.state.currentPersona.fitPassport ? t.state.currentPersona.fitPassport.archetypeId : null;
    const scoreBefore = t.confidenceScore(prod, archId);
    window.selectSize(t.state.screenParams.selectedSize === "M" ? "L" : "M");
    window.selectSize("S");
    window.toggleSizeGuide();
    const scoreAfter = t.confidenceScore(prod, archId);
    const nudgeCount = (document.getElementById("app").innerHTML.match(/nudge-card/g) || []).length;
    return { nudgeShown: t.state.screenParams.pdpSession.nudgeShown, nudgeCount, scoreBefore, scoreAfter };
  });
  await page.close();
  const pass = outcome.nudgeShown === true && outcome.nudgeCount === 1 && outcome.scoreBefore === outcome.scoreAfter;
  record("7. A1 exactly one nudge shown, score unchanged mid-session", pass, JSON.stringify(outcome));
}

function test8_arithmetic() {
  const conv = (5.1e6 * 0.22 * 0.57 * 0.42) / 9.2e6;
  const a = conv >= 0.02875;
  const blend = 0.45 * 21 + 0.55 * 23.5;
  const b = Math.round(blend * 10) / 10 === 22.4;
  const stats = JSON.parse(readFileSync(path.join(ROOT, "shared/sce-seed.json"), "utf8")).brandOrderStats;
  const targets = { speedstyle: 28, urbanedge: 21, maisonluxe: 9, ecoweave: 16, threadbasics: 19 };
  let c = true, detail = [];
  Object.keys(targets).forEach(id => {
    const diff = Math.abs(stats[id].returnRatePct - targets[id]);
    detail.push(id + ":" + stats[id].returnRatePct + "(target " + targets[id] + ", diff " + diff.toFixed(1) + ")");
    if (diff > 3) c = false;
  });
  record("8a. End-to-end conversion arithmetic >= 2.875%", a, conv.toFixed(4));
  record("8b. SpeedStyle blended-return arithmetic rounds to 22.4", b, blend.toFixed(3));
  record("8c. Seeded brand return rates within +/-3pp of targets", c, detail.join(", "));
}

function test9_checksumMatches() {
  const genOut = readFileSync(path.join(ROOT, "shared/sce-seed.json"), "utf8");
  const genChecksum = JSON.parse(genOut).checksum;
  const html = readFileSync(HTML_PATH, "utf8");
  const m = html.match(/const SCE_CHECKSUM = "([0-9a-f]{64})"/);
  const inlined = m ? m[1] : null;
  record("9. Inlined seed checksum equals generator's checksum", inlined === genChecksum, inlined + " vs " + genChecksum);
}

async function test10_noHorizontalOverflow(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(FILE_URL);
  await page.waitForTimeout(200);
  await page.click('[data-action="select-persona"][data-id="p1"]');
  await page.waitForTimeout(150);
  const screens = ["go-home","go-catalog","go-track","go-returns","go-account","go-support","go-wishlist","go-cart"];
  let allOk = true, detail = [];
  for (const s of screens) {
    await page.evaluate((action) => { document.querySelector('[data-action="' + action + '"]')?.click(); }, s);
    await page.waitForTimeout(100);
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    const ok = o.sw <= o.cw;
    detail.push(s + ":" + o.sw + "/" + o.cw);
    if (!ok) allOk = false;
  }
  await page.close();
  record("10. No horizontal overflow at 390px (8 screens)", allOk, detail.join(" "));
}
// Regression guard for a real bug this suite's manual QA caught: a broken product image's
// intrinsic size blowing out a `1fr 1fr` CSS Grid track (min-width:auto default) on the
// product detail page specifically, silently masked by html,body{overflow-x:hidden} — no
// visible scrollbar, but price/ring/add-to-cart were laid out off-screen. Checked at 1280px
// (desktop) on the PDP after the exact interaction sequence that surfaced it (two size
// toggles + opening the size guide, which also renders the A1 nudge card).
async function test10b_noPdpLayoutBlowoutAt1280(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(FILE_URL);
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.selectPersona("p1"); });
  await page.waitForTimeout(150);
  await page.evaluate(() => { const p = products.find(pr => pr.brandId === "speedstyle" && pr.fit_applicable); window.openProduct(p.id); });
  await page.waitForTimeout(150);
  await page.evaluate(() => { window.selectSize("S"); window.selectSize("M"); window.toggleSizeGuide(); });
  await page.waitForTimeout(150);
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, hasAddToCart: !!document.querySelector('[data-action="add-to-cart"]') }));
  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-action="add-to-cart"]');
    return el ? el.getBoundingClientRect().right : null;
  });
  await page.close();
  const pass = o.sw === o.cw && o.hasAddToCart && rect !== null && rect <= 1280;
  record("10b. PDP (with nudge + size guide open) has no grid blowout at 1280px", pass, JSON.stringify({ ...o, addToCartRight: rect }));
}

async function test11_standaloneGate() {
  const tmp = mkdtempSync(path.join(tmpdir(), "sce-standalone-"));
  const dest = path.join(tmp, "PWC_CX_Semi.html");
  cpSync(HTML_PATH, dest);
  const html = readFileSync(dest, "utf8");
  const forbidden = [/src="\.\//, /src="shared/, /href="\.\//, /\bimport\s/, /fetch\(\s*["'`](?!https:\/\/)/];
  const forbiddenHit = forbidden.find(re => re.test(html.replace(/href="\.\/PWC_CDP_Semi\.html/g, "")));
  let browser = null, errors = [], t1ok = false, t4ok = false, t5ok = false;
  try {
    browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("file://" + dest);
    await page.waitForTimeout(300);
    // re-run test 1 (all personas/screens, zero errors) against the standalone copy
    const screens = ["go-home","go-catalog","go-track","go-returns","go-account","go-support","go-wishlist","go-cart"];
    for (const p of ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10"]) {
      await page.evaluate((id) => { window.selectPersona(id); }, p);
      await page.waitForTimeout(100);
      for (const s of screens) {
        await page.evaluate((action) => { document.querySelector('[data-action="' + action + '"]')?.click(); }, s);
        await page.waitForTimeout(50);
      }
    }
    t1ok = errors.length === 0;
    // re-run test 4 (B4 accessories) standalone — select via evaluate, not a DOM click, since
    // the page may currently be on any screen after the loop above.
    await page.evaluate(() => { window.selectPersona("p1"); });
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.openProduct(products.find(p => p.category === "Accessories").id); });
    await page.waitForTimeout(100);
    t4ok = await page.evaluate(() => {
      const html2 = document.getElementById("app").innerHTML;
      return !html2.includes("confidence-ring") && html2.includes("One Size");
    });
    // re-run test 5 (B5 Maison Luxe) standalone, spot-check 3 SKUs
    await page.evaluate(() => { window.selectPersona("p6"); });
    await page.waitForTimeout(100);
    t5ok = await page.evaluate(() => {
      const ids = products.filter(p => p.brandId === "maisonluxe").slice(0, 3).map(p => p.id);
      return ids.every(id => {
        openProduct(id);
        const html2 = document.getElementById("app").innerHTML;
        const text = html2.replace(/<[^>]+>/g, " ");
        return !html2.includes("confidence-ring") && !html2.includes("ai-badge") && !/\bAI\b/.test(text);
      });
    });
    await page.close();
  } finally {
    if (browser) await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
  record("11a. Standalone gate: no forbidden local-file references in HTML", !forbiddenHit, forbiddenHit ? String(forbiddenHit) : "clean");
  record("11b. Standalone gate: test 1 (all personas/screens) passes copied+isolated", t1ok, errors.slice(0,3).join(" | "));
  record("11c. Standalone gate: test 4 (B4 accessories) passes copied+isolated", t4ok);
  record("11d. Standalone gate: test 5 (B5 Maison Luxe) passes copied+isolated", t5ok);
}

async function test12_deepLink(browser) {
  const { page, errors } = await newPageWithErrorCapture(browser, FILE_URL + "?persona=p6");
  const html = await page.evaluate(() => document.getElementById("app").innerHTML);
  await page.close();
  const pass = html.includes("Ishaan") && errors.length === 0;
  record("12. ?persona=p6 opens Ishaan's home directly", pass, "errors=" + errors.length);
}

async function main() {
  console.log("Target:", HTML_PATH);
  console.log("Chromium:", CHROMIUM_PATH);
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    await test1_allPersonasAllScreens(browser);
    await test2_b1_marketplaceReturnNoException(browser);
    await test3_b2b3_recommendedSizeAndFlagging(browser);
    await test4_b4_accessoriesNoScore(browser);
    await test5_b5_maisonLuxeClean(browser);
    await test6_b7_bannerSurvivesWishlistToggle(browser);
    await test7_a1_hesitationNudge(browser);
    test8_arithmetic();
    test9_checksumMatches();
    await test10_noHorizontalOverflow(browser);
    await test10b_noPdpLayoutBlowoutAt1280(browser);
    await test12_deepLink(browser);
  } finally {
    await browser.close();
  }
  // standalone gate launches its own browser instance against an isolated copy
  await test11_standaloneGate();

  console.log("\n=== SUMMARY ===");
  const passed = results.filter(r => r.pass).length;
  results.forEach(r => console.log((r.pass ? "  [x] " : "  [ ] ") + r.name));
  console.log(passed + "/" + results.length + " checks passed.");
  process.exit(results.every(r => r.pass) ? 0 : 1);
}

main();
