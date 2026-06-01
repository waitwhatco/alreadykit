/**
 * Launch-day screenshot capture for Already.
 * Run: node scripts/capture-screenshots.mjs
 *
 * Desktop 1440×900 · Mobile 390×844
 * App screens captured in both light and dark mode.
 * Output: ./screenshots/
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

async function shot(page, name) {
  const file = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  saved ${name}.png`);
}

async function shotFull(page, name) {
  const file = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  saved ${name}.png`);
}

async function goto(page, url) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 25000 });
  } catch {
    await page.waitForTimeout(1500);
  }
}

// Hides Next.js devtools badge (dev-only, not for launch screenshots)
const HIDE_DEVTOOLS_CSS = `
  nextjs-portal, #nextjs-portal-root, [data-nextjs-portal],
  [data-nextjs-dialog-overlay], [data-nextjs-dialog],
  #__next-build-watcher, .__next-build-watcher { display: none !important; }
`;

async function hideDevTools(page) {
  await page.addStyleTag({ content: HIDE_DEVTOOLS_CSS }).catch(() => {});
}

// ─────────────────────────────────────────────
// Landing page — localhost:3333 (static serve)
// Light mode only — it's the marketing site.
// ─────────────────────────────────────────────
async function captureLanding(browser) {
  console.log('\n▶ Landing page (localhost:3333)');

  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  await goto(page, 'http://localhost:3333');
  await page.waitForTimeout(1500);

  await shot(page, 'landing-hero-desktop');
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(400);
  await shot(page, 'landing-features-desktop');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await page.waitForTimeout(400);
  await shot(page, 'landing-pricing-desktop');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await shot(page, 'landing-footer-desktop');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shotFull(page, 'landing-full-desktop');
  await ctx.close();

  const ctxM = await browser.newContext({ viewport: MOBILE });
  const pageM = await ctxM.newPage();
  await goto(pageM, 'http://localhost:3333');
  await pageM.waitForTimeout(800);
  await shot(pageM, 'landing-hero-mobile');
  await pageM.evaluate(() => window.scrollBy(0, window.innerHeight));
  await pageM.waitForTimeout(400);
  await shot(pageM, 'landing-features-mobile');
  await ctxM.close();
}

// ─────────────────────────────────────────────
// Live website — already.wait-what.shop
// ─────────────────────────────────────────────
async function captureLiveSite(browser) {
  console.log('\n▶ Live website (already.wait-what.shop)');

  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  await goto(page, 'https://already.wait-what.shop');
  await page.waitForTimeout(1000);
  await shot(page, 'live-hero-desktop');
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(400);
  await shot(page, 'live-features-desktop');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await page.waitForTimeout(400);
  await shot(page, 'live-pricing-desktop');
  await ctx.close();

  const ctxM = await browser.newContext({ viewport: MOBILE });
  const pageM = await ctxM.newPage();
  await goto(pageM, 'https://already.wait-what.shop');
  await pageM.waitForTimeout(1000);
  await shot(pageM, 'live-hero-mobile');
  await pageM.evaluate(() => window.scrollBy(0, window.innerHeight));
  await pageM.waitForTimeout(400);
  await shot(pageM, 'live-features-mobile');
  await ctxM.close();
}

// ─────────────────────────────────────────────
// Template app — localhost:3001
// Each screen captured in dark + light, desktop + mobile.
// ─────────────────────────────────────────────
async function captureApp(browser) {
  console.log('\n▶ Template app (localhost:3001)');

  const BASE = 'http://localhost:3001';

  async function capturePage(suffix, baseName) {
    for (const scheme of ['dark', 'light']) {
      for (const [label, viewport] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
        const name = `${baseName}-${scheme}-${label}`;
        const ctx = await browser.newContext({
          viewport,
          colorScheme: scheme,
          locale: 'en-US',
          extraHTTPHeaders: { 'Accept-Language': 'en-US,en' },
        });
        const page = await ctx.newPage();
        try {
          await page.goto(BASE + suffix, { waitUntil: 'load', timeout: 25000 }).catch(() => {});
          await page.waitForTimeout(1500);
          await hideDevTools(page);
          await shot(page, name);
        } catch (err) {
          console.log(`  skipped ${name}: ${err.message}`);
        } finally {
          await ctx.close();
        }
      }
    }
  }

  // Auth flows
  await capturePage('/login',             'app-login');
  await capturePage('/signup',            'app-signup');
  await capturePage('/forgot-password',   'app-forgot-password');
  await capturePage('/mfa/verify',        'app-mfa-verify');

  // Public pages
  await capturePage('/pricing',           'app-pricing');

  // Docs
  await capturePage('/docs',              'app-docs-index');
  await capturePage('/docs/setup',        'app-docs-setup');
  await capturePage('/docs/architecture', 'app-docs-architecture');
  await capturePage('/docs/deployment',   'app-docs-deployment');

  // Authenticated screens — will redirect to login but show styled login page
  // (real dashboard/admin need live Supabase)
  await capturePage('/app',                   'app-dashboard');
  await capturePage('/app/settings',          'app-settings');
  await capturePage('/app/settings/api-keys', 'app-api-keys');
  await capturePage('/app/settings/billing',  'app-settings-billing');
  await capturePage('/app/ai',                'app-ai');
  await capturePage('/admin/users',           'app-admin-users');
  await capturePage('/admin/orgs',            'app-admin-orgs');
  await capturePage('/admin/audit',           'app-admin-audit');
  await capturePage('/onboarding',            'app-onboarding');
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
try {
  await captureLanding(browser);
  await captureLiveSite(browser);
  await captureApp(browser);
} finally {
  await browser.close();
}

console.log(`\n✓ Done — screenshots saved to ${OUT_DIR}`);
