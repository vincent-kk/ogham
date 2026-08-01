import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lineItem } from '../src/lineItem.js';

test('a line item shows its name and price', () => {
  assert.equal(lineItem('Coffee', 450), 'Coffee — $4.50');
});
