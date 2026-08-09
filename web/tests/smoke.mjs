#!/usr/bin/env node
/**
 * Smoke test for the Android APK's bundled app.
 *
 * Loads app/src/main/assets/www/index.html from a file:// URL (exactly like
 * the Android WebView does) in headless Chromium and asserts that the React
 * app actually renders. This catches the "blank white screen" class of bugs
 * (e.g. ES-module scripts, missing files, startup crashes).
 *
 * Run from the repo root:  node web/tests/smoke.mjs   (playwright must be installed)
 */
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve('app/src/main/assets/www/index.html');
const url = 'file://' + file;

const browser = await chromium.launch();
const page = await browser.newPage();

const fatal = [];
page.on('pageerror', (e) => fatal.push('uncaught exception: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') fatal.push('console error: ' + m.text());
});

console.log('Loading', url);
await page.goto(url, { waitUntil: 'load', timeout: 30000 });

// The React app must mount into #root
await page.waitForSelector('#root > *', { timeout: 20000 });
await page.waitForTimeout(3000);

const children = await page.locator('#root > *').count();
console.log('✅ #root has', children, 'child(ren) — app rendered');

// Network errors to Supabase / Google Fonts are expected and handled by the
// app itself; anything else is a real bug.
const realErrors = fatal.filter(
  (e) =>
    !/net::ERR_|Failed to fetch|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/i.test(e)
);
if (realErrors.length > 0) {
  console.error('❌ Fatal errors detected:');
  for (const e of realErrors) console.error('   ', e);
  process.exit(1);
}

console.log('✅ Smoke test passed — the app works from file://');
await browser.close();
