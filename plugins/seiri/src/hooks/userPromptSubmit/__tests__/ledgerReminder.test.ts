import { describe, expect, it, vi } from 'vitest';

import { ledgerReminder } from '../utils/ledgerReminder.js';

vi.mock('../../../core/gates/store/listTaskLedgers.js', () => ({
  listTaskLedgers: () => {
    throw new Error('unreadable task directory');
  },
}));

describe('ledger reminder failure isolation', () => {
  it('returns no clause when ledger observation throws', () => {
    expect(ledgerReminder('/repository')).toBeUndefined();
  });
});
