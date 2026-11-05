import { expect, it, vi } from 'vitest';

import { syncRuleDocs } from '../handlers/syncRuleDocs.js';

/** Supplies a partial sync at the tool payload boundary. */
const state = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock('../ruleDocsSync/index.js', () => ({ handleRuleDocsSync: state.sync }));

it('reports partial document sync as violations with an explicit partial count', async () => {
  state.sync.mockReturnValue({
    action: 'sync',
    result: {
      copied: [],
      updated: [],
      removed: [],
      skipped: [],
      drift: [],
      partial: [{ id: 'move' }],
      partialFailures: [
        {
          applied: ['/written'],
          failed: { target: '/failed', error: 'disk full' },
          notAttempted: [],
          backupPaths: [],
        },
      ],
    },
  });
  expect(
    await syncRuleDocs({
      action: 'rules-sync',
      path: '/project',
      selections: {},
    }),
  ).toMatchObject({
    status: 'violations',
    summary: { partial: 1 },
    data: {
      result: {
        partialFailures: [expect.objectContaining({ applied: ['/written'] })],
      },
    },
  });
});
