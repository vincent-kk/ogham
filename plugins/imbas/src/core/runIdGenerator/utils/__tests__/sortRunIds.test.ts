import { describe, expect, it } from 'vitest';

import { sortRunIds } from '../sortRunIds.js';

describe('sortRunIds', () => {
  it('orders dates before sequences with different widths', () => {
    expect(
      sortRunIds(['20261106-001', '20261105-1000', '20261105-999']),
    ).toEqual(['20261105-999', '20261105-1000', '20261106-001']);
  });

  it('compares large numeric sequences exactly', () => {
    expect(
      sortRunIds(['20261105-9007199254740993', '20261105-9007199254740992']),
    ).toEqual(['20261105-9007199254740992', '20261105-9007199254740993']);
  });

  it('filters non-ID names without changing the caller array', () => {
    const entries = [
      'notes',
      '20261105-1000',
      '20261105-001.backup',
      '20261105-01',
      '20261105-002\n',
      '20261105-003\r',
      '20261105-999',
    ];
    const original = [...entries];
    expect(sortRunIds(entries)).toEqual(['20261105-999', '20261105-1000']);
    expect(entries).toEqual(original);
  });
});
