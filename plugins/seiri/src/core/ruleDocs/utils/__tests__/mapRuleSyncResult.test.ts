import { describe, expect, it } from 'vitest';

import { mapRuleSyncResult } from '../mapRuleSyncResult.js';

describe('partial rule result mapping', () => {
  it('preserves partial action and physical progress through the settings result', () => {
    const partialFailures = [
      {
        applied: ['/written'],
        failed: { target: '/failed', error: 'disk full' },
        notAttempted: ['/later'],
        backupPaths: ['/failed.bak'],
      },
    ];
    const result = mapRuleSyncResult({
      applied: false,
      outcomes: [
        {
          id: 'move',
          action: 'partial',
          target: '/written',
          reason: 'disk full',
        },
      ],
      partialFailures,
      manifest: { version: '1', rules: [] },
    });
    expect(result).toMatchObject({
      applied: false,
      outcomes: [{ id: 'move', action: 'partial', reason: 'disk full' }],
      partialFailures,
    });
  });
});
