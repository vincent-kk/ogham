import { describe, expect, it } from 'vitest';

import { resolveReviewReuseReasons } from '../../../../mcp/tools/reviewState/group/resolveReviewReuseReasons.js';
import { computeReviewInputManifest } from '../../../../mcp/tools/reviewState/hash/computeReviewInputManifest.js';

/** Build one path-neutral file identity with independently mutable input sections. */
function manifest() {
  return computeReviewInputManifest({
    assignment: [{ path: '@file', change: 'M', chunk: null, owner: 'src' }],
    sourceHash: 'a'.repeat(64),
    rulesHash: 'b'.repeat(64),
    evidenceHash: 'c'.repeat(64),
    contextHash: 'd'.repeat(64),
    policyHash: 'e'.repeat(64),
  });
}
describe('incremental file input identity', () => {
  it('ignores assignment order but rejects duplicate assignments', () => {
    const first = manifest();
    const assignment = [
      ...first.assignment,
      { ...first.assignment[0], path: 'other' },
    ];
    expect(computeReviewInputManifest({ ...first, assignment }).groupKey).toBe(
      computeReviewInputManifest({
        ...first,
        assignment: [...assignment].reverse(),
      }).groupKey,
    );
    expect(() =>
      computeReviewInputManifest({
        ...first,
        assignment: [...first.assignment, ...first.assignment],
      }),
    ).toThrow(/duplicate/i);
  });
  it('accepts equal explicit inputs with a completed trusted opinion', () => {
    expect(resolveReviewReuseReasons(manifest(), manifest(), true)).toEqual([]);
  });
  it.each([
    ['sourceHash', 'source-input-changed'],
    ['rulesHash', 'rules-changed'],
    ['evidenceHash', 'evidence-changed'],
    ['contextHash', 'context-changed'],
    ['policyHash', 'policy-incompatible'],
  ] as const)('identifies a changed %s', (field, reason) => {
    expect(
      resolveReviewReuseReasons(
        computeReviewInputManifest({ ...manifest(), [field]: 'f'.repeat(64) }),
        manifest(),
        true,
      ),
    ).toEqual([reason]);
  });
  it('requires a completed trusted original pair', () => {
    expect(resolveReviewReuseReasons(manifest(), manifest(), false)).toEqual([
      'artifact-untrusted',
    ]);
  });
  it('rejects missing input provenance', () => {
    expect(resolveReviewReuseReasons(manifest(), undefined, true)).toContain(
      'input-unverifiable',
    );
  });
  it('rejects an unknown explicit context', () => {
    const input = computeReviewInputManifest({
      ...manifest(),
      contextHash: null,
    });
    expect(resolveReviewReuseReasons(input, input, true)).toContain(
      'input-unverifiable',
    );
  });
  it('rejects a forged digest', () => {
    const input = { ...manifest(), preparedInputHash: 'f'.repeat(64) };
    expect(resolveReviewReuseReasons(input, input, true)).toContain(
      'input-unverifiable',
    );
  });
  it('invalidates a changed owner', () => {
    const input = computeReviewInputManifest({
      ...manifest(),
      assignment: [{ ...manifest().assignment[0], owner: 'another' }],
    });
    expect(resolveReviewReuseReasons(input, manifest(), true)).toEqual([
      'composition-changed',
    ]);
  });
});
