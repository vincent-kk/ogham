import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyRuleDocs } from '../applyRuleDocs.js';

/** Controls apply progress and detects unsafe replanning or scope retirement. */
const state = vi.hoisted(() => ({
  apply: vi.fn(),
  retire: vi.fn(),
  plan: vi.fn(),
}));
vi.mock('../../loaders/loadManifest.js', () => ({
  loadManifest: () => ({ version: '1', rules: [] }),
}));
vi.mock('../../loaders/loadManagedRuleDocuments.js', () => ({
  loadManagedRuleDocuments: () => [],
}));
vi.mock('../../utils/createSeiriRuleManager.js', () => ({
  createSeiriRuleManager: () => ({ plan: state.plan, apply: state.apply }),
}));
vi.mock('../../utils/retireOtherScopeRules.js', () => ({
  retireOtherScopeRules: state.retire,
}));
vi.mock('../../utils/createRulePlanRevision.js', () => ({
  createRulePlanRevision: () => 'revision',
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.plan.mockReturnValue({});
});
describe('partial deployment reporting', () => {
  it('retains partial progress without replanning or retiring the other scope', () => {
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
    expect(applyRuleDocs('/project', '/plugin', [])).toMatchObject({
      applied: false,
      outcomes: [{ action: 'partial' }],
      partialFailures: [failure],
    });
    expect(state.retire).not.toHaveBeenCalled();
    expect(state.plan).toHaveBeenCalledTimes(1);
  });

  it('does not report complete success when the other scope was only partly withdrawn', () => {
    const failure = {
      applied: [],
      failed: { target: '/old', error: 'disk full' },
      notAttempted: [],
      backupPaths: [],
    };
    state.apply.mockReturnValue({
      outcomes: [{ id: 'done', action: 'copy', target: '/written' }],
      revisions: [],
    });
    state.retire.mockReturnValue({
      scope: 'user',
      filenames: [],
      partialFailures: [failure],
    });
    expect(applyRuleDocs('/project', '/plugin', [])).toMatchObject({
      applied: false,
      outcomes: [{ action: 'copy' }],
      otherScope: { partialFailures: [failure] },
    });
  });
});
