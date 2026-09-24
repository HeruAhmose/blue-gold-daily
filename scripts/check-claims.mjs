#!/usr/bin/env node
/**
 * Claims guard.
 * ---------------------------------------------------------------------------
 * Fails the build if prohibited language reaches the site.
 *
 * The claims discipline in the technical package is only worth something if it
 * survives contact with a hurried copy edit at 11pm. This encodes it: FDA
 * structure/function boundaries, the locked colorant decision, the hemp
 * position, and the Pharmactive trademark attribution are all enforced by CI
 * rather than by memory.
 *
 * Exit 1 on any violation. Wire it into the deploy workflow and a prohibited
 * claim cannot ship.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { inspectHtml } from './inspect-html.mjs';

const FORBIDDEN = [
  // --- disease / treatment claims (FDA) ---
  { re: /\b(treats?|cures?|prevents?)\s+(depression|anxiety|ptsd|insomnia|adhd|disease|cancer|alzheimer)/i,
    why: 'disease treatment claim — structure/function language only' },
  { re: /\bclinically proven\b/i, why: '"clinically proven" is an unsupportable absolute' },
  { re: /\bFDA[- ]approved\b/i, why: 'the product is not FDA-approved' },
  // "not intended to diagnose" is the required FDA disclaimer — allow the
  // negated form, catch the asserted one.
  { re: /(?<!not intended to )(?<!does not )\bdiagnoses\b|\bdiagnostic (tool|claim|device)\b/i,
    why: 'diagnostic claim' },

  // --- longevity overreach ---
  { re: /\breverses? aging\b/i, why: 'anti-aging reversal claim' },
  { re: /\bextends? (life|lifespan)\b/i, why: 'lifespan claim' },
  { re: /\bsenolytic\b/i, why: 'senolytic claim — human evidence does not support it' },
  { re: /\bclears? senescent cells\b/i, why: 'senolytic mechanism claim' },

  // --- controlled-substance adjacency ---
  { re: /\bpsychedelic\b/i, why: 'psychedelic framing is confined to the regulated clinical lane' },
  { re: /\bvision[- ]inducing\b/i, why: 'psychoactive claim' },
  { re: /\bmicrodos/i, why: 'microdosing framing' },

  // --- hemp position (locked) ---
  { re: /\bCBD\b/i, negatedBy: /\b(no|without|free of|excludes?|contains no|not)\b[^.]{0,40}\bCBD\b|\bCBD\b[^.]{0,30}\b(free|excluded)\b/i,
    why: 'consumer SKU is hempseed-derived only; CBD may appear only in a negation' },
  { re: /\bfull[- ]spectrum\b/i, why: 'implies cannabinoids' },
  { re: /\bhemp (flower|leaf) extract\b/i, why: 'outside the GRAS hempseed inputs' },

  // --- colorant decision (locked) ---
  { re: /gardenia\s*(\(genipin\))?\s*blue/i,
    negatedBy: /\b(no|not|excluded?|without|removed|instead of|rather than)\b[^.]{0,60}gardenia|gardenia[^.]{0,80}\b(excluded?|not (used|in)|removed|would require)\b/i,
    why: 'Gardenia blue is excluded — soy protein hydrolysate allergen and weaker heat/acid stability' },

  // --- trademark attribution ---
  { re: /Affron-(equivalent|comparable)/i,
    why: 'Lepticrosalides® is trademarked and patent-protected; use "Affron®" and state single-sourcing' },

  // --- fabricated validation ---
  { re: /\b(Oak Ridge|NIST|Argonne|Sandia|Los Alamos)\b/i,
    why: 'no national laboratory has validated this work' },
  { re: /\bpeer[- ]reviewed\b/i, why: 'no peer-reviewed publication exists yet' },
  { re: /\bpost[- ]doctoral dissertation\b/i, why: 'implies credentials and institutional review that do not exist' },

  // --- unfilled template placeholders ---
  { re: /\[(Institution Name|Advisor Name|Insert Date|Insert Contact Info)\]/i,
    why: 'unfilled template placeholder' },
  { re: /\blorem ipsum\b/i, why: 'placeholder copy' },
  { re: /manus\.computer/i, why: 'temporary sandbox URL' },
];

/** Claims that must be present — silent removal is also a failure. */
const REQUIRED = [
  { file: 'product.html', re: /no CBD, no THC/i, why: 'hemp clarification must appear on the product page' },
  { file: 'science.html', re: /21 CFR 73\.167/, why: 'the Galdieria citation must appear on the evidence page' },
];

const files = readdirSync('.').filter((f) => f.endsWith('.html'));
const documents = new Map(files.map(file => [file, inspectHtml(readFileSync(file, 'utf8'))]));
let fail = 0;

for (const f of files) {
  const body = documents.get(f).claims;
  for (const { re, why, negatedBy } of FORBIDDEN) {
    const matches = [...body.matchAll(new RegExp(re.source, `${re.flags}g`))];
    for (const [occurrence, m] of matches.entries()) {
      // A term may appear inside an explicit negation — "contains no CBD",
      // "Gardenia blue is excluded". Those are the claim being kept, not broken.
      if (negatedBy) {
        // A negation must cover this occurrence in the same sentence. A safe
        // first mention must not hide a later asserted claim.
        const before = body.slice(0, m.index);
        const previous = matches[occurrence - 1];
        const next = matches[occurrence + 1];
        const start = Math.max(
          Math.max(...['.', '!', '?', ';', '\n'].map(c => before.lastIndexOf(c))) + 1,
          previous ? previous.index + previous[0].length : 0,
        );
        const tail = body.slice(m.index);
        const boundary = tail.search(/[.!?;\n]/);
        const end = Math.min(boundary < 0 ? body.length : m.index + boundary, next?.index ?? body.length);
        const sentence = body.slice(start, end);
        const position = m.index - start;
        const negations = sentence.matchAll(new RegExp(negatedBy.source, `${negatedBy.flags}g`));
        if ([...negations].some(n => n.index <= position && position < n.index + n[0].length)) continue;
      }
      const at = body.slice(Math.max(0, m.index - 60), m.index + 90).replace(/\s+/g, ' ');
      console.error(`✗ ${f}\n    matched: "${m[0]}"\n    reason:  ${why}\n    context: …${at}…\n`);
      fail++;
    }
  }
}

for (const { file, re, why } of REQUIRED) {
  if (!documents.has(file) || !re.test(documents.get(file).claims)) {
    console.error(`✗ ${file}\n    missing: ${re}\n    reason:  ${why}\n`);
    fail++;
  }
}

if (fail) {
  console.error(`\nclaims guard: ${fail} violation(s). Build blocked.`);
  process.exit(1);
}
console.log(`claims guard: ${files.length} pages clean.`);
