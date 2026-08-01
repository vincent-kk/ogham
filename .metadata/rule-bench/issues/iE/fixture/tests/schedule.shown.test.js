import assert from 'node:assert/strict';
import { test } from 'node:test';

import { schedule } from '../scheduler.js';

test('tasks run in ascending priority order', () => {
  const order = schedule([
    { name: 'archive', priority: 10 },
    { name: 'deploy', priority: 2 },
    { name: 'triage', priority: 1 },
  ]);
  assert.deepEqual(order, ['triage', 'deploy', 'archive']);
});
