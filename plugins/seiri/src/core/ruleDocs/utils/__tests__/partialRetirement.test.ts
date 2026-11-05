import { expect, it, vi } from 'vitest';

import { retireOtherScopeRules } from '../retireOtherScopeRules.js';

/** Injects physical progress for an interrupted retirement plan. */
const state = vi.hoisted(() => ({ apply: vi.fn() }));
vi.mock('../createSeiriRuleManager.js', () => ({
  createSeiriRuleManager: () => ({ plan: () => ({}), apply: state.apply }),
}));
vi.mock('../inspectOtherScopeRules.js', () => ({
  inspectOtherScopeRules: () => ({
    scope: 'user',
    displayTarget: '/old',
    filenames: ['move.md'],
  }),
}));

it('preserves actual file progress when withdrawing a document fails partway through', () => {
  const failure = {
    applied: ['/written'],
    failed: { target: '/failed', error: 'disk full' },
    notAttempted: [],
    backupPaths: [],
  };
  state.apply.mockReturnValue({
    outcomes: [{ id: 'move', action: 'partial', target: '/written' }],
    revisions: [],
    partialFailures: [failure],
  });
  expect(retireOtherScopeRules('/project', [], 'project')).toMatchObject({
    filenames: [],
    partialFailures: [failure],
  });
});
