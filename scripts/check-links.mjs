#!/usr/bin/env node
/**
 * Link and asset integrity check.
 * Catches the failure that ships most often: a renamed file leaving a dead
 * href or a 404 image. Internal targets only — external URLs are validated in
 * the deploy workflow so CI never fails on someone else's downtime.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inspectHtml } from './inspect-html.mjs';

const pages = readdirSync('.').filter((f) => f.endsWith('.html'));
let fail = 0;
const documents = new Map(pages.map(page => [page, inspectHtml(readFileSync(page, 'utf8'))]));

const localRef = (v) =>
  v && !/^(https?:|mailto:|tel:|data:|\/\/)/i.test(v);

for (const page of pages) {
  for (const { name, value } of documents.get(page).references) {
    const ref = value.trim();
    if (!localRef(ref)) continue;
    const hash = ref.indexOf('#');
    const location = hash < 0 ? ref : ref.slice(0, hash);
    let path, id;
    try {
      path = decodeURIComponent(location.split('?')[0]);
      id = hash < 0 ? '' : decodeURIComponent(ref.slice(hash + 1));
    } catch {
      console.error(`✗ ${page} → ${ref}  (invalid URL encoding)`);
      fail++;
      continue;
    }
    const target = path ? join(path.startsWith('/') ? '.' : dirname(page), path) : page;
    if (!existsSync(target)) {
      console.error(`✗ ${page} → ${ref}  (missing)`);
      fail++;
      continue;
    }
    if (name === 'href' && id && target.endsWith('.html')) {
      if (!documents.has(target)) documents.set(target, inspectHtml(readFileSync(target, 'utf8')));
      if (!documents.get(target).ids.has(id)) {
        console.error(`✗ ${page} → ${ref}  (no matching id)`);
        fail++;
      }
    }
  }
}

if (fail) {
  console.error(`\nlink check: ${fail} broken reference(s).`);
  process.exit(1);
}
console.log(`link check: ${pages.length} pages, all internal references resolve.`);
