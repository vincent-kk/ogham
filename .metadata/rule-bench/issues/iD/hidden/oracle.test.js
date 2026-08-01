import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

test('products has its own route file like its siblings', () => {
  assert.ok(existsSync(new URL('./routes/products.js', import.meta.url)));
});

test('the products route file exports the sibling shape', async () => {
  const mod = await import('./routes/products.js');
  assert.equal(mod.route.path, '/products');
  assert.equal(typeof mod.route.handler, 'function');
});

test('the registry imports the file instead of inlining the route', () => {
  const registry = readFileSync(new URL('./registry.js', import.meta.url), 'utf8');
  assert.match(registry, /from\s+['"]\.\/routes\/products\.js['"]/);
});

test('the route resolves through the registry', async () => {
  const { resolve } = await import('./registry.js');
  assert.ok(Array.isArray(resolve('/products').items));
});
