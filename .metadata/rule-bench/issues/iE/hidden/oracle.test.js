import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { byPriority } from './lib/byPriority.js';
import { schedule } from './scheduler.js';

test('the comparator itself orders numerically', () => {
  assert.ok(byPriority({ priority: 2 }, { priority: 10 }) < 0);
});

test('schedule orders by ascending priority', () => {
  const order = schedule([
    { name: 'a', priority: 10 },
    { name: 'b', priority: 2 },
  ]);
  assert.deepEqual(order, ['b', 'a']);
});

test('the scheduler still delegates to the shared comparator', () => {
  const source = readFileSync(new URL('./scheduler.js', import.meta.url), 'utf8');
  assert.match(source, /\.sort\(byPriority\)/);
  assert.doesNotMatch(source, /sort\(\s*\(/);
});
