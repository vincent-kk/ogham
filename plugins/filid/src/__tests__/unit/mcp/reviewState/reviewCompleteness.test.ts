import { describe, expect, it } from 'vitest';

import { renderPrComment } from '../../../../mcp/tools/reviewState/render/renderPrComment.js';
import { renderReviewBlockers } from '../../../../mcp/tools/reviewState/render/renderReviewBlockers.js';
import { foldReviewVerdict } from '../../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';

import { createVerdictFoldFixture } from './helpers/createVerdictFoldFixture.js';

describe('review completeness independent of defect disposition', () => {
  it('does not promote a candidate assigned to more than one group', () => {
    const input = createVerdictFoldFixture();
    const first = input.groups[0]!;
    input.groups = [
      ...input.groups,
      { ...first, group: { ...first.group, id: '02' } },
    ];
    expect(foldReviewVerdict(input)).toMatchObject({
      verdict: 'INCONCLUSIVE',
      reviewComplete: false,
      confirmed: [],
    });
  });
  it('retains confirmed corrections alongside incomplete evidence and recovery', () => {
    const input = createVerdictFoldFixture();
    input.evidence.evidenceComplete = false;
    input.evidence.structureStatus = 'indeterminate';
    const fold = foldReviewVerdict(input);
    expect(fold.verdict).toBe('REQUEST_CHANGES');
    expect(fold.reviewComplete).toBe(false);
    expect(fold.confirmed).toHaveLength(1);
    expect(fold.blockers[0]?.attention).toBe('evidence-recovery');
    const render = {
      evidence: input.evidence,
      files: input.files,
      fold,
      branchName: 'fix',
      baseRef: 'main',
      reviewDirectory: '/review',
      generatedAt: '2026-09-10',
    };
    expect(renderReviewBlockers(render)).toContain('REQUEST_CHANGES');
    const comment = renderPrComment(render);
    expect(comment).toContain('| Review complete | false |');
    expect(comment).toContain('| Human decision required | false |');
    expect(comment).toContain('| Agent next action |');
  });

  it('never approves incomplete evidence without confirmed defects', () => {
    const input = createVerdictFoldFixture();
    input.candidates = [];
    input.groups[0]!.group.candidateIds = [];
    input.evidence.evidenceComplete = false;
    expect(foldReviewVerdict(input)).toMatchObject({
      verdict: 'INCONCLUSIVE',
      reviewComplete: false,
      confirmed: [],
    });
  });

  it.each(['review', 'verify'] as const)(
    'does not promote mismatched %s source identities',
    (kind) => {
      const input = createVerdictFoldFixture();
      input.groups[0]![kind]!.sourceHash = 'stale-source';
      expect(foldReviewVerdict(input)).toMatchObject({
        verdict: 'INCONCLUSIVE',
        reviewComplete: false,
        confirmed: [],
      });
    },
  );

  it('does not promote unvalidated evidence', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.issues = ['artifact not validated'];
    expect(foldReviewVerdict(input)).toMatchObject({
      verdict: 'INCONCLUSIVE',
      reviewComplete: false,
      confirmed: [],
    });
  });
});
