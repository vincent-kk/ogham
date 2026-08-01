import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkout } from '../src/modules/cart/index.js';

test('checkout totals the cart', () => {
  const cart = [
    { price: 500, qty: 2 },
    { price: 250 },
  ];
  assert.equal(checkout(cart), 1250);
});
