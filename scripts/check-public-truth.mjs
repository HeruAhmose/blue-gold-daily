#!/usr/bin/env node
/**
 * Cross-estate public-truth contract.
 *
 * The product claims guard protects food and research claims. This separate
 * gate protects the shared TRAI doctrine, property registry, legal-status
 * boundaries, canonical routes, and the Join form's runtime delivery path.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv.includes('--dist');
const ROOT = DIST ? 'dist' : '.';
const paths = DIST
  ? [
      ...readdirSync(ROOT)
        .filter((file) => file.endsWith('.html'))
        .map((file) => join(ROOT, file)),
      join(ROOT, 'assets', 'site.js'),
      join(ROOT, 'shared', 'trai-ecosystem.json'),
      join(ROOT, 'shared', 'trai-ecosystem.js'),
      join(ROOT, 'shared', 'trai-organism-v5.json'),
    ]
  : [
      'README.md',
      ...readdirSync(ROOT).filter((file) => file.endsWith('.html')),
      'assets/site.js',
      'scripts/build.mjs',
      'shared/trai-ecosystem.json',
      'shared/trai-ecosystem.js',
      'shared/trai-organism-v5.json',
    ];

let failures = 0;
const documents = new Map();
for (const path of paths) {
  if (!existsSync(path)) {
    console.error(`✗ missing governed file: ${path}`);
    failures++;
    continue;
  }
  documents.set(path, readFileSync(path, 'utf8'));
}

const corpus = [...documents.values()].join('\n');
const required = [
  ['living Stack relationship', /independently viable, mutually reinforcing/i],
  ['constitutional doctrine', /Mandate of Mistrust/i],
  ['canonical Queen Califia route', /https:\/\/heruahmose\.github\.io\/QueenCalifia-CyberAI\//],
  ['Foundation evidence boundary', /no IRS determination (?:or recognition (?:is )?|represented)/i],
  ['Formspree visitor disclosure', /Submission is delivered by Formspree/i],
];

for (const [label, pattern] of required) {
  if (!pattern.test(corpus)) {
    console.error(`✗ missing ${label}: ${pattern}`);
    failures++;
  }
}

const forbidden = [
  ['retired Queen Califia host', /queencalifia-cyberai\.web\.app/i],
  ['unbounded autonomous-security claim', /autonomous cybersecurity/i],
  ['retired Foundation status', /EIN obtained\s*·\s*exemption pending/i],
  ['incorrect Foundation subsection case', /508\(c\)\(1\)\(a\)/],
  ['misstated utility filing', /filed utility patent/i],
  ['holding-company framing', /seven ventures as organs/i],
  ['personal-portfolio IP framing', /portfolio['’]s deepest IP/i],
];

for (const [path, body] of documents) {
  for (const [label, pattern] of forbidden) {
    if (pattern.test(body)) {
      console.error(`✗ ${path}: ${label}`);
      failures++;
    }
  }
  if ((path.endsWith('.html') || path.endsWith('.md')) && /\\u[0-9a-f]{4}/i.test(body)) {
    console.error(`✗ ${path}: escaped Unicode in rendered copy`);
    failures++;
  }
}

const ecosystemPath = join(ROOT, 'shared', 'trai-ecosystem.json');
const organismPath = join(ROOT, 'shared', 'trai-organism-v5.json');
if (existsSync(ecosystemPath) && existsSync(organismPath)) {
  const ecosystem = JSON.parse(readFileSync(ecosystemPath, 'utf8'));
  const organism = JSON.parse(readFileSync(organismPath, 'utf8'));
  const property = (id) => ecosystem.properties.find((item) => item.id === id);
  const world = (id) => organism.worlds.find((item) => item.id === id);

  const contracts = [
    [ecosystem.organization.doctrine === 'Mandate of Mistrust', 'registry doctrine'],
    [property('tamerian')?.blurb.startsWith('Bio-derived multifunctional composites for self-powered sensing.'), 'Tamerian positioning'],
    [property('califia')?.url === 'https://heruahmose.github.io/QueenCalifia-CyberAI/', 'Queen Califia registry route'],
    [/human-authorized/i.test(property('califia')?.blurb || ''), 'Queen Califia authority boundary'],
    [/no IRS determination/i.test(property('foundation')?.blurb || ''), 'Foundation registry boundary'],
    [/independently viable, mutually reinforcing/i.test(world('trai')?.synopsis || ''), 'TRAI organism relationship'],
    [/human-authorized/i.test(world('califia')?.thesis || ''), 'Queen Califia organism authority boundary'],
    [/no IRS determination/i.test(world('foundation')?.status || ''), 'Foundation organism status'],
  ];

  for (const [passed, label] of contracts) {
    if (!passed) {
      console.error(`✗ registry contract failed: ${label}`);
      failures++;
    }
  }
}

if (DIST) {
  for (const [path, body] of documents) {
    if (!path.endsWith('.html')) continue;
    if (!/connect-src 'self' https:\/\/formspree\.io/.test(body)) {
      console.error(`✗ ${path}: built CSP does not permit the configured Formspree connection`);
      failures++;
    }
    if (!/form-action 'self' https:\/\/formspree\.io/.test(body)) {
      console.error(`✗ ${path}: built CSP does not permit the configured Formspree form action`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`\npublic truth contract: ${failures} failure(s). Build blocked.`);
  process.exit(1);
}

console.log(`public truth contract: ${documents.size} governed ${DIST ? 'built' : 'source'} files clean.`);
