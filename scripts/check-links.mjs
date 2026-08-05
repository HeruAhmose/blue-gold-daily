#!/usr/bin/env node
/**
 * Link and asset integrity check.
 * Catches the failure that ships most often: a renamed file leaving a dead
 * href or a 404 image. Internal targets only — external URLs are validated in
 * the deploy workflow so CI never fails on someone else's downtime.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const pages = readdirSync('.').filter((f) => f.endsWith('.html'));
let fail = 0;

const localRef = (v) =>
  v && !/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(v);

for (const page of pages) {
  const html = readFileSync(page, 'utf8');

  const refs = [
    ...[...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]),
  ].filter(localRef);

  for (const ref of new Set(refs)) {
    const path = ref.split('#')[0].split('?')[0];
    if (!path) continue;
    const target = path.startsWith('/') ? join('.', path) : join('.', path);
    if (!existsSync(target)) {
      console.error(`✗ ${page} → ${ref}  (missing)`);
      fail++;
    }
  }

  // in-page anchors must resolve to a real id
  for (const m of html.matchAll(/href="#([\w-]+)"/g)) {
    const id = m[1];
    if (id && !new RegExp(`id="${id}"`).test(html)) {
      console.error(`✗ ${page} → #${id}  (no matching id)`);
      fail++;
    }
  }
}

if (fail) {
  console.error(`\nlink check: ${fail} broken reference(s).`);
  process.exit(1);
}
console.log(`link check: ${pages.length} pages, all internal references resolve.`);
