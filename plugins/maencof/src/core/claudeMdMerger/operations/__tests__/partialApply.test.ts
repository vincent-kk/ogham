/** Consumer regression: raw instruction APIs preserve interrupted apply details. */
import type { InstructionSectionApplyResult } from '@ogham/agent-artifacts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClaudeMdMerger } from '../claudeMdMerger.js';
import { mergeMaencofSection } from '../mergeMaencofSection.js';
import { removeMaencofSection } from '../removeMaencofSection.js';

/** Manager boundary stub; filesystem failures are represented by its public result. */
const manager = vi.hoisted(() => ({
  inspect: vi.fn(() => ({ status: 'present' })),
  plan: vi.fn(() => ({
    outcomes: [{ action: 'remove' }],
    previews: [{ content: 'planned' }],
  })),
  apply: vi.fn<() => InstructionSectionApplyResult>(),
}));

vi.mock('@ogham/agent-artifacts', () => ({
  createResolvedInstructionSectionManager: () => manager,
}));
vi.mock('@ogham/cross-platform', () => ({
  readUtf8FileIfExistsSync: () => 'original',
}));

beforeEach(() => vi.clearAllMocks());

describe.each([
  { name: 'first-file failure', backupPaths: [] },
  {
    name: 'write failure after its backup',
    backupPaths: ['/vault/CLAUDE.md.bak'],
  },
])('$name', ({ backupPaths }) => {
  it.each([
    {
      name: 'merge',
      invoke: () => mergeMaencofSection('/vault/CLAUDE.md', 'new'),
    },
    { name: 'remove', invoke: () => removeMaencofSection('/vault/CLAUDE.md') },
    {
      name: 'class merge',
      invoke: () => new ClaudeMdMerger('/vault/CLAUDE.md').merge('new'),
    },
    {
      name: 'class remove',
      invoke: () => new ClaudeMdMerger('/vault/CLAUDE.md').remove(),
    },
  ])(
    '$name throws with every recovery field instead of reporting no change',
    ({ invoke }) => {
      const partialFailures = [
        {
          applied: [],
          failed: { target: '/vault/CLAUDE.md', error: 'disk full' },
          notAttempted: [],
          backupPaths,
        },
      ];
      const result: InstructionSectionApplyResult = {
        outcomes: [
          { id: 'maencof', target: '/vault/CLAUDE.md', action: 'partial' },
        ],
        revisions: [],
        partialFailures,
        backupPaths,
      };
      manager.apply.mockReturnValue(result);

      expect(invoke).toThrowError(
        expect.objectContaining({
          message: JSON.stringify({ status: 'partial', partialFailures }),
          cause: result,
        }),
      );
      expect(manager.apply).toHaveBeenCalledOnce();
    },
  );
});
