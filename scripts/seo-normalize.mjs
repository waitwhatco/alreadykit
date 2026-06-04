#!/usr/bin/env node
// seo-normalize.mjs — post-process the built site for SEO correctness.
//
// Runs against ./dist after build.sh copies files. Idempotent. Fixes the
// systemic issues Ahrefs flagged on alreadykit.com:
//   - strips invalid per-language hreflang (i18n is client-side; no real
//     per-language URLs exist, so hreflang for de/es/it/fr is meaningless)
//   - rewrites slashless dir-page links (/docs -> /docs/) that 301
//   - forces canonical + og:url to the page's real route
//   - injects missing Open Graph / Twitter card tags
//   - regenerates sitemap.xml from actual indexable 200 pages with correct slashes
//
// Usage: node scripts/seo-normalize.mjs [dist-dir]

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = process.argv[2] || 'dist';
const ORIGIN = 'https://alreadykit.com';
const DEFAULT_OG_IMAGE = `${ORIGIN}/og.png`;
const SITE_NAME = 'Already';
// og.html / social-cards.html are build artifacts, not served pages.
const SKIP = new Set(['og.html', 'social-cards.html']);
// 404.html is normalized (links/hreflang) but never listed in the sitemap.
const NO_SITEMAP = new Set(['/404']);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// File path -> public route.
//   dist/index.html            -> /
//   dist/docs/index.html       -> /docs/
//   dist/vs/shipfast.html      -> /vs/shipfast
function routeFor(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel.slice(0, -'.html'.length);
}

const files = walk(DIST).filter((f) => !SKIP.has(relative(DIST, f).split(sep).pop()));

// Routes that end in "/" are directory pages; their slashless form 301s.
const dirRoutes = files
  .map(routeFor)
  .filter((r) => r !== '/' && r.endsWith('/'))
  .map((r) => r.slice(0, -1)); // "/docs/" -> "/docs"
// Longest first so /ch/docs is handled before /ch.
dirRoutes.sort((a, b) => b.length - a.length);

const stats = { hreflang: 0, links: 0, canonical: 0, og: 0, twitter: 0, descMissing: [], descLen: [] };

function fixLinks(html) {
  let n = 0;
  for (const r of dirRoutes) {
    // Match href to the slashless dir route, bounded by quote, #, or ? — both
    // root-relative and absolute forms. Append the trailing slash.
    const re = new RegExp(`href="(${ORIGIN})?${r}(?=["#?])`, 'g');
    html = html.replace(re, (m) => {
      n++;
      return m + '/';
    });
  }
  stats.links += n;
  return html;
}

function stripHreflang(html) {
  const before = html;
  html = html.replace(/[ \t]*<link[^>]*rel="alternate"[^>]*hreflang="[^"]*"[^>]*>\s*\n?/g, '');
  if (html !== before) stats.hreflang++;
  return html;
}

function ensureCanonical(html, route) {
  const url = ORIGIN + route;
  if (/<link[^>]*rel="canonical"/.test(html)) {
    html = html.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/, `$1${url}$2`);
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${url}">\n</head>`);
    stats.canonical++;
  }
  return html;
}

function getTag(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function ensureSocial(html, route) {
  const url = ORIGIN + route;
  const title =
    getTag(html, /<meta property="og:title" content="([^"]*)"/) ||
    getTag(html, /<title>([^<]*)<\/title>/) ||
    SITE_NAME;
  const desc =
    getTag(html, /<meta name="description" content="([^"]*)"/) ||
    getTag(html, /<meta property="og:description" content="([^"]*)"/) ||
    '';

  // og:url must always match the route.
  if (/<meta property="og:url"/.test(html)) {
    html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  }

  const inject = [];
  const need = (prop, attr, value) => {
    if (!new RegExp(`${attr}="${prop}"`).test(html)) {
      inject.push(`  <meta ${attr}="${prop}" content="${value}">`);
      return true;
    }
    return false;
  };

  let ogAdded = false;
  ogAdded |= need('og:type', 'property', 'website');
  ogAdded |= need('og:url', 'property', url);
  ogAdded |= need('og:site_name', 'property', SITE_NAME);
  ogAdded |= need('og:title', 'property', title);
  ogAdded |= need('og:description', 'property', desc);
  ogAdded |= need('og:image', 'property', DEFAULT_OG_IMAGE);
  if (ogAdded) stats.og++;

  let twAdded = false;
  twAdded |= need('twitter:card', 'name', 'summary_large_image');
  twAdded |= need('twitter:title', 'name', title);
  twAdded |= need('twitter:description', 'name', desc);
  twAdded |= need('twitter:image', 'name', DEFAULT_OG_IMAGE);
  if (twAdded) stats.twitter++;

  if (inject.length) {
    html = html.replace('</head>', inject.join('\n') + '\n</head>');
  }

  // Report-only: meta description health.
  const md = getTag(html, /<meta name="description" content="([^"]*)"/);
  if (!md) stats.descMissing.push(route);
  else if (md.length < 70 || md.length > 155) stats.descLen.push(`${route} (${md.length})`);

  return html;
}

const sitemapRoutes = [];

for (const file of files) {
  const route = routeFor(file);
  let html = readFileSync(file, 'utf8');
  const noindex = /<meta[^>]*name="robots"[^>]*noindex/i.test(html) || /noindex/i.test(html);

  html = stripHreflang(html);
  html = fixLinks(html);
  html = ensureCanonical(html, route);
  html = ensureSocial(html, route);
  writeFileSync(file, html);

  if (!noindex && !NO_SITEMAP.has(route)) sitemapRoutes.push(route);
}

// Regenerate sitemap from indexable routes only, sorted, deduped, correct slashes.
const uniq = [...new Set(sitemapRoutes)].sort();
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  uniq.map((r) => `  <url><loc>${ORIGIN}${r}</loc></url>`).join('\n') +
  '\n</urlset>\n';
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

console.log('→ SEO normalize');
console.log(`  pages processed:     ${files.length}`);
console.log(`  hreflang stripped:   ${stats.hreflang} pages`);
console.log(`  redirect links fixed:${stats.links}`);
console.log(`  canonical injected:  ${stats.canonical}`);
console.log(`  OG injected:         ${stats.og} pages`);
console.log(`  Twitter injected:    ${stats.twitter} pages`);
console.log(`  sitemap URLs:        ${uniq.length} (noindex excluded)`);
if (stats.descMissing.length) console.log(`  ⚠ missing description: ${stats.descMissing.join(', ')}`);
if (stats.descLen.length) console.log(`  ⚠ description length:  ${stats.descLen.join(', ')}`);
