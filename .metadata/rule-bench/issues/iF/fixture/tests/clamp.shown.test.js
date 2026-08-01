import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clamp } from '../src/clamp.js';

test('values inside the range pass through', () => {
  assert.equal(clamp(5, 0, 10), 5);
});

test('values above the range clamp to the upper bound', () => {
  assert.equal(clamp(15, 0, 10), 10);
});
