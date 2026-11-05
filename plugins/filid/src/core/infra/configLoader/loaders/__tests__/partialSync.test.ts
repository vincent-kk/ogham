import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncRuleDocs } from '../syncRuleDocs.js';

/** Isolates the result boundary from filesystem setup and scope retirement. */
const state = vi.hoisted(() => ({ apply: vi.fn(), retire: vi.fn() }));
vi.mock('../../utils/resolvePluginRoot.js', () => ({
  resolvePluginRoot: () => '/plugin',
}));
vi.mock('../loadRuleDocsManifest.js', () => ({
  loadRuleDocsManifest: () => ({ version: '1', rules: [] }),
}));
vi.mock('../loadManagedRuleDocuments.js', () => ({
  loadManagedRuleDocuments: () => [],
}));
vi.mock('../createFilidRuleManager.js', () => ({
  createFilidRuleManager: () => ({ plan: () => ({}), apply: state.apply }),
}));
vi.mock('../retireOtherScopeRuleDocs.js', () => ({
  retireOtherScopeRuleDocs: state.retire,
}));

beforeEach(() => vi.clearAllMocks());
describe('partial deployment scope safety', () => {
  it('returns physical progress without retiring the other scope after partial deployment', () => {
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
    const result = syncRuleDocs('/project', [], { scope: 'project' });
    expect(state.retire).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      partialFailures: [failure],
      partial: [{ id: 'move' }],
    });
  });
});
