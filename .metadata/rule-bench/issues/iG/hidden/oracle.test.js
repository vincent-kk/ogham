import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cartDir = fileURLToPath(new URL('./src/modules/cart/', import.meta.url));
const sources = readdirSync(cartDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(join(cartDir, file), 'utf8'))
  .join('\n');

test('cart never reaches into billing internals', () => {
  assert.doesNotMatch(sources, /billing\/internal/);
});

test('cart consumes billing through its entry point', () => {
  assert.match(sources, /from\s+['"]\.\.\/billing(\/index\.js)?['"]/);
});

test('checkout computes the cart total', async () => {
  const { checkout } = await import('./src/modules/cart/index.js');
  assert.equal(checkout([{ price: 100, qty: 3 }, { price: 50 }]), 350);
});
