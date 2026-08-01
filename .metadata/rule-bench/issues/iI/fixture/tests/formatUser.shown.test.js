import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatUser } from '../src/formatUser.js';

test('formatUser includes the email in angle brackets', () => {
  assert.equal(
    formatUser({ name: 'Ada', email: 'ada@example.com' }),
    'Ada <ada@example.com>',
  );
});
