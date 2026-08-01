import assert from 'node:assert/strict';
import { test } from 'node:test';

import { invoiceHeader } from '../src/modules/invoices/index.js';
import { reportLine } from '../src/modules/reports/index.js';

const date = new Date('2026-08-01T12:00:00Z');

test('report lines carry an ISO date', () => {
  assert.equal(reportLine('Quarterly totals', date), '2026-08-01 — Quarterly totals');
});

test('invoice headers carry an ISO date', () => {
  assert.equal(invoiceHeader('INV-7', date), 'INV-7 (2026-08-01)');
});
