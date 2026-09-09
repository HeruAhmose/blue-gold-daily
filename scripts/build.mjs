#!/usr/bin/env node
/**
 * Build.
 * ---------------------------------------------------------------------------
 * The static site needs no bundling; the one thing it does need is its real
 * domain baked into canonical URLs, og:url, sitemap and robots. Those come from
 * SITE_URL at deploy time, so no production URL is ever committed and the repo
 * cannot ship pointing at a placeholder.
 *
 * The build also injects a page-specific Content Security Policy. Inline
 * JavaScript is allowed only when its exact SHA-256 hash matches the built
 * document. Inline styles remain allowed because the source pages intentionally
 * use component-local <style> blocks and style attributes.
 *
 *   SITE_URL=https://bluegolddaily.com npm run build
 *
 * Output lands in dist/ so the source tree is never mutated.
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const PLACEHOLDER = 'https://bluegolddaily.com';
const SITE = (process.env.SITE_URL || PLACEHOLDER).replace(/\/$/, '');
const OUT = 'dist';

if (!/^https:\/\//.test(SITE)) {
  console.error(`✗ SITE_URL must be an https URL (got "${SITE}")`);
  process.exit(1);
}

function sha256Source(text) {
  return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

function injectCsp(html) {
  const inlineScriptHashes = [];
  const scriptRe = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    inlineScriptHashes.push(sha256Source(match[1]));
  }

  const scriptSources = ["'self'", "'inline-speculation-rules'", ...new Set(inlineScriptHashes)].join(' ');
  const policy = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self' https://formspree.io",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://formspree.io",
    "upgrade-insecure-requests"
  ].join('; ');

  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  return html.replace(/<meta charset="UTF-8">/i, (charset) => `${charset}\n${meta}`);
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

const copy = ['assets', 'shared', 'og.png', 'netlify.toml', 'vercel.json'];
for (const c of copy) if (existsSync(c)) cpSync(c, join(OUT, c), { recursive: true });

const pages = readdirSync('.').filter((f) => f.endsWith('.html'));
for (const p of pages) {
  const html = injectCsp(readFileSync(p, 'utf8').replaceAll(PLACEHOLDER, SITE));
  writeFileSync(join(OUT, p), html);
}

for (const f of ['sitemap.xml', 'robots.txt']) {
  if (existsSync(f)) {
    writeFileSync(join(OUT, f), readFileSync(f, 'utf8').replaceAll(PLACEHOLDER, SITE));
  }
}

// Point the ecosystem registry at the deployed domain so the cross-site bar
// links back correctly from every other property.
const regPath = join(OUT, 'shared', 'trai-ecosystem.json');
if (existsSync(regPath)) {
  const reg = JSON.parse(readFileSync(regPath, 'utf8'));
  const self = reg.properties.find((x) => x.id === 'bluegold');
  if (self && !self.url) self.url = SITE + '/';
  writeFileSync(regPath, JSON.stringify(reg, null, 2));
}

console.log(`build: ${pages.length} pages → ${OUT}/  (SITE_URL ${SITE})`);
if (SITE === PLACEHOLDER) {
  console.warn('  note: using the placeholder domain. Set SITE_URL for production.');
}
