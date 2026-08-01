import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cartDir = fileURLToPath(new URL('./src/modules/cart/', import.meta.url));

function jsFilesUnder(dir) {
  const acc = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.js')) acc.push(p);
    }
  };
  walk(dir);
  return acc;
}

const sources = jsFilesUnder(cartDir)
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

test('cart never reaches into billing internals', () => {
  assert.doesNotMatch(sources, /billing\/internal/);
});

test('cart consumes billing through its entry point', () => {
  assert.match(sources, /from\s+['"](\.\.\/)+billing(\/index\.js)?['"]/);
});

test('checkout computes the cart total', async () => {
  const { checkout } = await import('./src/modules/cart/index.js');
  assert.equal(checkout([{ price: 100, qty: 3 }, { price: 50 }]), 350);
});
