import { describe, expect, it } from 'vitest';

import { mapRuleSyncResult } from '../mapRuleSyncResult.js';

describe('partial rule result mapping', () => {
  it('preserves partial documents and their physical progress instead of skipping them', () => {
    const partialFailures = [
      {
        applied: ['/written'],
        failed: { target: '/failed', error: 'disk full' },
        notAttempted: ['/later'],
        backupPaths: ['/failed.bak'],
      },
    ];
    const result = mapRuleSyncResult(
      {
        outcomes: [
          {
            id: 'move',
            action: 'partial',
            target: '/written',
            reason: 'disk full',
          },
          { id: 'done', action: 'copy', target: '/written' },
        ],
        revisions: [],
        partialFailures,
      },
      { version: '1', rules: [] },
    );
    expect(result).toMatchObject({
      copied: ['done'],
      skipped: [],
      partial: [{ id: 'move', filename: 'move', reason: 'disk full' }],
      partialFailures,
    });
  });
});
