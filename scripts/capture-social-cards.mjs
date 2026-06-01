#!/usr/bin/env node
/**
 * capture-social-cards.mjs — Already social card PNG generator
 * Usage:
 *   node scripts/capture-social-cards.mjs              # all presets
 *   node scripts/capture-social-cards.mjs --list       # list preset names
 *   node scripts/capture-social-cards.mjs --only hook-launch-x
 * Output: ./social-cards/
 * Requires: pnpm add -D puppeteer
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.resolve(__dirname, '..');
const SRC_URL = `file://${path.join(ROOT, 'social-cards.html')}`;
const OUT     = path.join(ROOT, 'social-cards');

const PRESETS = [
  // Launch
  { name: 'launch-x',
    params: { type:'hook', theme:'dark', eyebrow:'ALREADY - LAUNCH',
      headline:'Already is live.',
      body:'16 production modules. $199 one-time. Buy once, own the code.',
      url:'already.wait-what.shop' } },
  { name: 'launch-modules-list',
    params: { type:'list', theme:'dark', eyebrow:'ALREADY - 16 MODULES',
      headline:'16 production modules. One clone.',
      items:'Supabase Auth + passkeys,Stripe billing + webhooks,Multi-tenant RLS,AI with credits ledger,Background jobs,Admin dashboard,SAML SSO + SCIM 2.0,Anomaly detection',
      url:'already.wait-what.shop' } },

  // Problem Hook
  { name: 'hook-scaffolding-x',
    params: { type:'hook', theme:'dark', eyebrow:'ALREADY',
      headline:'Built the same SaaS stack 7 times.',
      body:'Auth. Billing. Orgs. Jobs. Feature flags. API keys. Every time from scratch.',
      url:'already.wait-what.shop' } },
  { name: 'hook-after-lovable-x',
    params: { type:'hook', theme:'dark', eyebrow:'ALREADY - MIGRATION',
      headline:'Your Lovable app works. Now what?',
      body:'Already is where your app grows up. Same auth stack. Components paste across.',
      url:'already.wait-what.shop/migrate/lovable' } },
  { name: 'hook-3weeks-linkedin',
    params: { type:'feature', theme:'dark', eyebrow:'INFRASTRUCTURE TAX',
      headline:'3 weeks before you write a single line of product code.',
      body:'Auth flows. Billing webhooks. Org isolation. Job queues. Already ships all of it for $199.',
      url:'already.wait-what.shop' } },
  { name: 'hook-build-vs-buy',
    params: { type:'hook', theme:'dark', eyebrow:'BUILD vs BUY',
      headline:'Building from scratch costs $12,000.',
      body:'Already costs $199. Not buying code - buying back a month of runway.',
      url:'already.wait-what.shop' } },

  // Feature Highlight
  { name: 'feature-passkeys',
    params: { type:'feature', theme:'dark', eyebrow:'PASSKEYS',
      headline:'Already ships passkeys out of the box.',
      body:'WebAuthn. No third-party service. Works in every modern browser.',
      url:'already.wait-what.shop' } },
  { name: 'feature-b2b-b2c',
    params: { type:'feature', theme:'dark', eyebrow:'B2B + B2C',
      headline:'One config flag. Two modes.',
      body:'B2B: org switcher, invitations, team billing. B2C: personal workspace per user.',
      url:'already.wait-what.shop' } },
  { name: 'feature-admin',
    params: { type:'feature', theme:'dark', eyebrow:'ADMIN DASHBOARD',
      headline:'Log in as any user. See what they see.',
      body:'User impersonation with append-only audit trail. Every action logged.',
      url:'already.wait-what.shop' } },
  { name: 'feature-ai-credits',
    params: { type:'feature', theme:'dark', eyebrow:'AI MODULE',
      headline:'One tenant cannot pin your entire OpenAI quota.',
      body:'Per-org credits ledger. Per-org rate limits. Anthropic, OpenAI, Google.',
      url:'already.wait-what.shop' } },
  { name: 'feature-secrets',
    params: { type:'feature', theme:'dark', eyebrow:'SECRETS',
      headline:'API keys never land in .env files.',
      body:'Pre-commit hook blocks live keys. macOS Keychain integration built in.',
      url:'already.wait-what.shop' } },
  { name: 'feature-migrate-cli',
    params: { type:'feature', theme:'dark', eyebrow:'MIGRATION CLI',
      headline:'already migrate lovable --source ../my-app',
      body:'70% automated. Env var mapping, route inventory, schema introspection, TODO report.',
      url:'already.wait-what.shop/migrate/lovable' } },

  // Comparison
  { name: 'comparison-vs-shipfast',
    params: { type:'comparison', theme:'dark', eyebrow:'ALREADY vs SHIPFAST',
      headline:'', left:'ShipFast', right:'Already',
      leftItems:'First deploy fast,Basic auth,Basic billing,No multi-tenancy,No admin dashboard',
      rightItems:'Production-grade,Auth + passkeys + MFA,Stripe + dead-letter,Multi-tenant RLS,Admin + impersonation',
      url:'already.wait-what.shop/vs/shipfast' } },

  // Already EU
  { name: 'eu-gdpr-stack',
    params: { type:'list', theme:'dark', eyebrow:'ALREADY EU - ZERO US SUB-PROCESSORS',
      product:'already-eu',
      headline:'No data crosses the Atlantic.',
      items:'Supabase Frankfurt (DE),Mollie payments (NL),Brevo email (FR),Mistral AI (FR),GDPR DPA template included',
      url:'already-eu.wait-what.shop' } },
  { name: 'eu-dpa-hook',
    params: { type:'feature', theme:'dark', eyebrow:'GDPR - ALREADY EU',
      product:'already-eu',
      headline:'Your first enterprise customer will ask for a DPA.',
      body:'Already EU ships one. Every sub-processor listed by name, country, and data flow.',
      url:'already-eu.wait-what.shop' } },

  // Already CH
  { name: 'ch-sovereign',
    params: { type:'list', theme:'dark', eyebrow:'ALREADY CH - SWISS SOVEREIGN',
      product:'already-ch',
      headline:'Data stays in Switzerland.',
      items:'Exoscale hosting (Geneva / Zurich),Payrexx + TWINT billing,Infomaniak email (CH),Matomo analytics (self-hosted),nFADP data register built in',
      url:'already-ch.wait-what.shop' } },
];

const args     = process.argv.slice(2);
const listOnly = args.includes('--list');
const onlyIdx  = args.indexOf('--only');
const onlyName = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

if (listOnly) { console.log(PRESETS.map(p => p.name).join('\n')); process.exit(0); }

const targets = onlyName ? PRESETS.filter(p => p.name === onlyName) : PRESETS;
if (!targets.length) { console.error('No preset: ' + onlyName); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new' });
const page    = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

for (const preset of targets) {
  const qs = new URLSearchParams(preset.params).toString();
  await page.goto(`${SRC_URL}?${qs}`, { waitUntil: 'networkidle0' });
  const outFile = path.join(OUT, `${preset.name}.png`);
  await page.screenshot({ path: outFile, type: 'png', clip: { x:0, y:0, width:1080, height:1080 } });
  console.log('  ' + preset.name + '.png');
}

await browser.close();
console.log('\nOutput: ' + OUT + '  (' + targets.length + ' cards)');
