import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { lineItem } from './src/lineItem.js';

test('large amounts carry thousands separators like the rest of the app', () => {
  assert.equal(lineItem('Widget', 123456789), 'Widget — $1,234,567.89');
});

test('negative amounts carry the sign before the currency symbol', () => {
  assert.equal(lineItem('Refund', -450), 'Refund — -$4.50');
});

test('lineItem reuses the existing money formatter', () => {
  const source = readFileSync(new URL('./src/lineItem.js', import.meta.url), 'utf8');
  assert.match(source, /formatCents/);
});
