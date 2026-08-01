import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolve } from '../registry.js';

test('the products route resolves', () => {
  const result = resolve('/products');
  assert.ok(Array.isArray(result.items));
  assert.ok(result.items.length > 0);
});
