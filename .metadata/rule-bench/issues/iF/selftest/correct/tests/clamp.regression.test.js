import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clamp } from '../src/clamp.js';

test('regression: above-range input returns the upper bound, not the lower one', () => {
  assert.equal(clamp(15, 0, 10), 10);
});
