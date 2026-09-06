import { describe, expect, it } from 'vitest';

import { planReviewReuse } from '../../../../mcp/tools/reviewState/group/planReviewReuse.js';
import { computeReviewInputManifest } from '../../../../mcp/tools/reviewState/hash/computeReviewInputManifest.js';

/**
 * Build an independent localized fixture, not the historical incident.
 * @returns Fifty-two trusted pairs with distinct assignments and equal context.
 */
function groups() {
  return Array.from({ length: 52 }, (_, index) => ({
    id: String(index + 1).padStart(2, '0'),
    input: computeReviewInputManifest({
      assignment: [
        {
          path: `src/module-${index}.ts`,
          change: 'M',
          chunk: null,
          owner: 'src',
        },
      ],
      sourceHash: 'a'.repeat(64),
      rulesHash: 'b'.repeat(64),
      evidenceHash: 'c'.repeat(64),
      contextHash: 'd'.repeat(64),
      policyHash: 'e'.repeat(64),
    }),
    rounds: 2,
    dependsOn: [],
    complete: true,
    trusted: true,
  }));
}

describe('incremental reviewer cost accounting', () => {
  it('reuses 48 pairs when only four localized evidence inputs change', () => {
    const previous = groups();
    const current = previous.map((group) =>
      ['08', '09', '21', '22'].includes(group.id)
        ? {
            ...group,
            input: computeReviewInputManifest({
              ...group.input,
              evidenceHash: 'f'.repeat(64),
            }),
          }
        : group,
    );
    const result = planReviewReuse({ current, previous });
    expect(result.summary).toEqual({
      reusedGroups: 48,
      rerunGroups: 4,
      newGroups: 0,
      removedGroups: 0,
      bookkeepingGroups: 0,
      remainingMaxReviewerHandoffs: 8,
    });
    expect(
      result.decisions
        .filter((entry) => entry.disposition === 'rerun')
        .map((entry) => entry.group),
    ).toEqual(['08', '09', '21', '22']);
  });

  it('reruns every consumer of changed global context', () => {
    const previous = groups();
    const current = previous.map((group) => ({
      ...group,
      input: computeReviewInputManifest({
        ...group.input,
        contextHash: 'f'.repeat(64),
      }),
    }));
    const result = planReviewReuse({ current, previous });
    expect(result.summary).toMatchObject({
      reusedGroups: 0,
      rerunGroups: 52,
      remainingMaxReviewerHandoffs: 104,
    });
    expect(
      result.decisions.every((entry) =>
        entry.reasons.includes('context-changed'),
      ),
    ).toBe(true);
  });
});
