import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { quote } from './src/quote.js';

const srcDir = fileURLToPath(new URL('./src/', import.meta.url));
const PRISTINE = new Set(['config.js', join('pricing', 'lineTotal.js'), 'quote.js']);

function jsFilesUnder(dir) {
  const acc = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.js')) acc.push(relative(dir, p));
    }
  };
  walk(dir);
  return acc;
}

const added = jsFilesUnder(srcDir).filter((file) => !PRISTINE.has(file));
const shippingFile = added.find((file) => /ship/i.test(file));

test('shipping math computes through quote', () => {
  assert.deepEqual(
    quote([
      { price: 1000, kg: 2 },
      { price: 500, kg: 1 },
    ]),
    { subtotal: 1500, shipping: 860, total: 2360 },
  );
});

test('the shipping computation lives in its own module', () => {
  assert.ok(shippingFile, `added files: ${added.join(', ') || 'none'}`);
});

test('the shipping module takes rates as parameters instead of importing config', () => {
  assert.ok(shippingFile);
  const source = readFileSync(join(srcDir, shippingFile), 'utf8');
  assert.doesNotMatch(source, /from\s+['"][^'"]*config[^'"]*['"]/);
});

test('the shipping module exports exactly one symbol', () => {
  assert.ok(shippingFile);
  const source = readFileSync(join(srcDir, shippingFile), 'utf8');
  assert.equal(source.match(/^export\s/gm)?.length, 1);
});
