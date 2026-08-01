import assert from 'node:assert/strict';
import { test } from 'node:test';

import { quote } from '../src/quote.js';

test('a quote includes shipping and a grand total', () => {
  const result = quote([{ price: 1000, kg: 2 }]);
  assert.equal(result.subtotal, 1000);
  assert.equal(result.shipping, 740);
  assert.equal(result.total, 1740);
});
