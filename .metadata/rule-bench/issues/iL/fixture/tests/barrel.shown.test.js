import assert from 'node:assert/strict';
import { test } from 'node:test';

import { farewell } from '../index.js';

test('farewell is available from the package entry point', () => {
  assert.equal(farewell('ada'), 'Goodbye, Ada.');
});
