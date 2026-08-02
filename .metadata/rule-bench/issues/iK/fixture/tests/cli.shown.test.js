import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dispatch } from '../cli.js';

test('status command reports ok', async () => {
  const out = await dispatch('status', []);
  assert.match(String(out), /ok/i);
});
