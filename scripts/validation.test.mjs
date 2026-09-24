import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

function runGuard(script, pages) {
  const cwd = mkdtempSync(join(tmpdir(), 'blue-gold-guard-'));
  try {
    for (const [file, html] of Object.entries(pages)) writeFileSync(join(cwd, file), html);
    const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {
      cwd, encoding: 'utf8', timeout: 10000,
    });
    assert.ifError(result.error);
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function claims(html, extra = {}) {
  return runGuard('check-claims.mjs', {
    'index.html': html,
    'product.html': '<p>no CBD, no THC</p>',
    'science.html': '<p>21 CFR 73.167</p>',
    ...extra,
  });
}

test('claims gate accepts explicit negations and ignores HTML comments', () => {
  assert.equal(claims('<p>No CBD. Gardenia blue is excluded.</p><!-- clinically proven -->').status, 0);
});

for (const html of [
  '<p>clinically proven</p>',
  '<p>clini<strong>cally</strong> proven</p>',
  '<p>clini<!-- note -->cally proven</p>',
  '<p>clinically&#32;proven</p>',
  '<p class="legal">clinically proven</p>',
  '<p>No CBD.</p><p>Contains CBD.</p>',
  '<p>No CBD, but contains CBD.</p>',
  '<meta name="description" content="clinically proven">',
]) {
  test(`claims gate rejects: ${html}`, () => {
    const result = claims(html);
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /violation/);
  });
}

test('required evidence must be real text, not a comment', () => {
  assert.equal(claims('', { 'science.html': '<!-- 21 CFR 73.167 -->' }).status, 1);
});

test('anchors use literal IDs with punctuation, quoting and decoded entities', () => {
  const result = runGuard('check-links.mjs', {
    'index.html': '<div id="a.b[1]&amp;c"></div><a href=\'#a.b%5B1%5D%26c\'>local</a><a href="other.html#x.y">other</a>',
    'other.html': '<p id=x.y>target</p>',
  });
  assert.equal(result.status, 0, result.output);
});

for (const html of [
  '<div id="axb"></div><a href="#a.b">broken</a>',
  '<a href=\'#missing\'>broken</a>',
  '<a href="other.html#missing">broken</a>',
  '<img src=\'missing.png\'>',
  '<a href="#bad%ZZ">broken</a>',
]) {
  test(`links gate rejects: ${html}`, () => {
    const result = runGuard('check-links.mjs', { 'index.html': html, 'other.html': '<p id="real">target</p>' });
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /broken reference/);
  });
}
