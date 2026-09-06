import { describe, expect, it } from 'vitest';

import { planReviewReuse } from '../../../../mcp/tools/reviewState/group/planReviewReuse.js';
import { computeReviewInputManifest } from '../../../../mcp/tools/reviewState/hash/computeReviewInputManifest.js';

/**
 * Build independently named assignments with equal observed input sections.
 * @param path Distinct assigned source path used to control group composition.
 * @returns A complete manifest with independently mutable input section digests.
 */
function manifest(path = 'src/value.ts') {
  return computeReviewInputManifest({
    assignment: [{ path, change: 'M', chunk: null, owner: 'src' }],
    sourceHash: 'a'.repeat(64),
    rulesHash: 'b'.repeat(64),
    evidenceHash: 'c'.repeat(64),
    contextHash: 'd'.repeat(64),
    policyHash: 'e'.repeat(64),
  });
}

/**
 * Model a complete validated pair without coupling tests to opinion IO.
 * @param id Display identifier used for dependency references.
 * @param input Manifest whose equality the planner must evaluate.
 * @returns A trusted completed origin candidate with no dependencies.
 */
function prior(id: string, input = manifest()) {
  return { id, input, rounds: 1, dependsOn: [], trusted: true, complete: true };
}

describe('incremental review input identity', () => {
  it('ignores assignment order but rejects duplicate assignments', () => {
    const first = manifest();
    const second = manifest('src/other.ts');
    const input = {
      ...first,
      assignment: [...first.assignment, ...second.assignment],
    };
    expect(computeReviewInputManifest(input).groupKey).toBe(
      computeReviewInputManifest({
        ...input,
        assignment: [...input.assignment].reverse(),
      }).groupKey,
    );
    expect(() =>
      computeReviewInputManifest({
        ...input,
        assignment: [...first.assignment, ...first.assignment],
      }),
    ).toThrow(/duplicate/i);
  });

  it('matches stable composition across display ID changes', () => {
    const previous = prior('01');
    const result = planReviewReuse({
      previous: [previous],
      current: [{ ...previous, id: '02' }],
    });
    expect(result.decisions).toEqual([
      { group: '02', previousGroup: '01', disposition: 'reused', reasons: [] },
    ]);
  });

  it.each([
    ['sourceHash', 'source-input-changed'],
    ['rulesHash', 'rules-changed'],
    ['evidenceHash', 'evidence-changed'],
    ['contextHash', 'context-changed'],
    ['policyHash', 'policy-incompatible'],
  ] as const)('invalidates a changed %s', (field, reason) => {
    const previous = prior('01');
    const input = computeReviewInputManifest({
      ...previous.input,
      [field]: 'f'.repeat(64),
    });
    const result = planReviewReuse({
      previous: [previous],
      current: [{ ...previous, input }],
    });
    expect(result.decisions[0]).toMatchObject({
      disposition: 'rerun',
      reasons: [reason],
    });
  });

  it.each([{ trusted: false }, { complete: false }])(
    'rejects an untrusted or incomplete origin %j',
    (change) => {
      const previous = prior('01');
      const result = planReviewReuse({
        previous: [{ ...previous, ...change }],
        current: [previous],
      });
      expect(result.decisions[0]).toMatchObject({
        disposition: 'rerun',
        reasons: ['artifact-untrusted'],
      });
    },
  );

  it('rejects an unobserved context even when both snapshots omit it', () => {
    const previous = prior(
      '01',
      computeReviewInputManifest({ ...manifest(), contextHash: null }),
    );
    expect(
      planReviewReuse({ previous: [previous], current: [previous] })
        .decisions[0].reasons,
    ).toContain('input-unverifiable');
  });

  it('rejects matching manifests whose claimed digest was altered', () => {
    const previous = prior('01', {
      ...manifest(),
      preparedInputHash: 'f'.repeat(64),
    });
    expect(
      planReviewReuse({ previous: [previous], current: [previous] })
        .decisions[0],
    ).toMatchObject({ disposition: 'rerun', reasons: ['input-unverifiable'] });
  });

  it('never approves a dependency cycle', () => {
    const first = { ...prior('01'), dependsOn: ['02'] };
    const second = {
      ...prior('02', manifest('src/second.ts')),
      dependsOn: ['01'],
    };
    const result = planReviewReuse({
      previous: [first, second],
      current: [first, second],
    });
    expect(
      result.decisions.every(
        (entry) =>
          entry.disposition === 'rerun' &&
          entry.reasons.includes('dependency-invalidated'),
      ),
    ).toBe(true);
  });

  it('fails closed on ambiguous origins and missing dependencies', () => {
    const previous = prior('01');
    const current = { ...previous, dependsOn: ['99'] };
    const result = planReviewReuse({
      previous: [previous, { ...previous, id: '02' }],
      current: [current],
    });
    expect(result.decisions[0].reasons).toEqual(
      expect.arrayContaining(['composition-changed', 'dependency-invalidated']),
    );
  });

  it('propagates invalidation through dependencies in reverse roster order', () => {
    const first = prior('01');
    const second = {
      ...prior('02', manifest('src/second.ts')),
      dependsOn: ['01'],
    };
    const third = {
      ...prior('03', manifest('src/third.ts')),
      dependsOn: ['02'],
    };
    const changed = {
      ...first,
      input: computeReviewInputManifest({
        ...first.input,
        evidenceHash: 'f'.repeat(64),
      }),
    };
    const result = planReviewReuse({
      previous: [first, second, third],
      current: [third, second, changed],
    });
    expect(result.summary).toMatchObject({ reusedGroups: 0, rerunGroups: 3 });
    expect(result.decisions[0].reasons).toContain('dependency-invalidated');
  });

  it('separates added, removed and bookkeeping groups from reviewer cost', () => {
    const current = [
      { ...prior('02', manifest('src/added.ts')), rounds: 2 },
      { ...prior('03', manifest('docs/info.md')), rounds: 0 },
    ];
    expect(
      planReviewReuse({ previous: [prior('01')], current }).summary,
    ).toEqual({
      reusedGroups: 0,
      rerunGroups: 0,
      newGroups: 1,
      removedGroups: 1,
      bookkeepingGroups: 1,
      remainingMaxReviewerHandoffs: 2,
    });
  });

  it('forces all reviewable groups without treating them as newly added', () => {
    const previous = prior('01');
    expect(
      planReviewReuse({
        previous: [previous],
        current: [previous],
        force: true,
      }).decisions[0],
    ).toMatchObject({ disposition: 'rerun', reasons: ['forced'] });
  });
});
