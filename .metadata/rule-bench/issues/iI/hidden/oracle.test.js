import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { formatUser } from './src/formatUser.js';

const source = readFileSync(new URL('./src/formatUser.js', import.meta.url), 'utf8');

test('the new format is produced', () => {
  assert.equal(
    formatUser({ name: 'Grace', email: 'grace@example.com' }),
    'Grace <grace@example.com>',
  );
});

test('the doc comment no longer claims the old behavior', () => {
  assert.doesNotMatch(source, /name only/i);
});

test('the doc comment describes the new shape', () => {
  assert.match(source, /email/i);
});

test('no history markers were left in the source', () => {
  assert.doesNotMatch(source, /previously|used to|changed from|was:/i);
});
