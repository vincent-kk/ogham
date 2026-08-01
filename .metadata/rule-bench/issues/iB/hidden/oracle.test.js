import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const barrel = readFileSync(new URL('./index.js', import.meta.url), 'utf8');

test('the entry point re-exports by name, never wildcard', () => {
  assert.doesNotMatch(barrel, /export\s*\*/);
});

test('farewell is exported from the entry point', async () => {
  const api = await import('./index.js');
  assert.equal(typeof api.farewell, 'function');
});

test('the internal helper is not leaked through the entry point', async () => {
  const api = await import('./index.js');
  assert.equal('capitalize' in api, false);
});
