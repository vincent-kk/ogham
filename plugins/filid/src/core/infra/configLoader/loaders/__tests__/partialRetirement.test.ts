import { expect, it, vi } from 'vitest';

import { retireOtherScopeRuleDocs } from '../retireOtherScopeRuleDocs.js';

/** Supplies a partially completed withdrawal without touching user files. */
const state = vi.hoisted(() => ({ apply: vi.fn() }));
vi.mock('@ogham/agent-artifacts', () => ({
  createRuleDocumentManager: () => ({ plan: () => ({}), apply: state.apply }),
}));
vi.mock('../resolveFilidRuleTarget.js', () => ({
  resolveFilidRuleTarget: () => ({
    kind: 'directory',
    directoryPath: '/rules',
  }),
}));

it('preserves failed withdrawal progress even when no document was fully removed', () => {
  const failure = {
    applied: ['/written'],
    failed: { target: '/failed', error: 'disk full' },
    notAttempted: ['/later'],
    backupPaths: [],
  };
  state.apply.mockReturnValue({
    outcomes: [{ id: 'move', action: 'partial', target: '/written' }],
    revisions: [],
    partialFailures: [failure],
  });
  expect(
    retireOtherScopeRuleDocs('/project', 'project', [], {
      version: '1',
      rules: [],
    }),
  ).toMatchObject({ scope: 'user', filenames: [], partialFailures: [failure] });
});
