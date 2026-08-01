import assert from 'node:assert/strict';
import { test } from 'node:test';

import { errorCount } from '../report.js';

test('errorCount counts error entries', () => {
  assert.equal(
    errorCount([{ level: 'error' }, { level: 'info' }, { level: 'error' }]),
    2,
  );
});
