import { portableJoin, tmp } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

import type { ReviewGroupArtifactStatus } from '../../../../mcp/tools/reviewState/handoff/handoffTypes.js';
import { planNextHandoffs } from '../../../../mcp/tools/reviewState/handoff/planNextHandoffs.js';

import { buildReviewHandoffFixture } from './helpers/buildReviewHandoffFixture.js';

describe('planNextHandoffs', () => {
  it.each([
    {
      label: 'missing review',
      review: 'missing',
      verify: 'missing',
      complete: false,
      round: 1,
      assigned: null,
      kind: 'review',
      nextRound: 1,
      ready: false,
    },
    {
      label: 'invalid review',
      review: 'invalid',
      verify: 'missing',
      complete: true,
      round: 2,
      assigned: null,
      kind: 'review',
      nextRound: 2,
      ready: false,
    },
    {
      label: 'next review round',
      review: 'trusted',
      verify: 'missing',
      complete: false,
      round: 1,
      assigned: 1,
      kind: 'review',
      nextRound: 2,
      ready: false,
    },
    {
      label: 'awaiting server auto-verify',
      review: 'trusted',
      verify: 'missing',
      complete: true,
      round: 2,
      assigned: 0,
      kind: null,
      nextRound: undefined,
      ready: false,
    },
    {
      label: 'assigned verifier',
      review: 'trusted',
      verify: 'missing',
      complete: true,
      round: 2,
      assigned: 1,
      kind: 'verify',
      nextRound: undefined,
      ready: false,
    },
    {
      label: 'invalid verifier',
      review: 'trusted',
      verify: 'invalid',
      complete: true,
      round: 2,
      assigned: 1,
      kind: 'verify',
      nextRound: undefined,
      ready: false,
    },
    {
      label: 'trusted pair',
      review: 'trusted',
      verify: 'trusted',
      complete: true,
      round: 2,
      assigned: 1,
      kind: null,
      nextRound: undefined,
      ready: true,
    },
  ] as const)('plans $label from normalized facts', (row) => {
    const { state, paths } = buildReviewHandoffFixture(
      portableJoin(tmp(), 'handoff-plan'),
    );
    const group = state.groups[0]!;
    group.validated.review =
      row.review === 'missing'
        ? null
        : { round: row.round, complete: row.complete, sha256: 'review-hash' };
    const status: ReviewGroupArtifactStatus = {
      group: group.id,
      review: row.review,
      verify: row.verify,
      roundFiles: [1, 2],
      assignedCount: row.assigned,
      briefPresent: true,
      verifyBriefPresent: true,
    };
    const before = JSON.stringify({ state, paths, status });
    const result = planNextHandoffs({ state, paths, statuses: [status] });
    expect(result.sealReady).toBe(row.ready);
    expect(result.next).toEqual(
      row.kind === null
        ? []
        : [
            {
              kind: row.kind,
              group: '01',
              ...(row.nextRound === undefined ? {} : { round: row.nextRound }),
              briefPath: portableJoin(
                paths.reviewDirectory,
                row.kind === 'review' ? group.briefPath : group.verifyBriefPath,
              ),
              outputPath: portableJoin(
                paths.reviewDirectory,
                row.kind === 'review'
                  ? `opinions/review-01.r${row.nextRound}.json`
                  : group.verifyPath,
              ),
              priorOpinionPath:
                row.kind === 'review' && row.nextRound! >= 2
                  ? portableJoin(paths.reviewDirectory, group.opinionPath)
                  : null,
            },
          ],
    );
    expect(JSON.stringify({ state, paths, status })).toBe(before);
  });

  it('waits for dependencies until their complete review and verify are trusted', () => {
    const { state, paths } = buildReviewHandoffFixture(
      portableJoin(tmp(), 'handoff-dependencies'),
    );
    const group = state.groups[0]!;
    state.groups.push({
      ...group,
      id: '02',
      dependsOn: ['01'],
      briefPath: 'briefs/review-02.md',
      skeletonPath: 'opinions/review-02.r1.json',
      opinionPath: 'opinions/review-02.json',
      verifyPath: 'opinions/verify-02.json',
      verifyBriefPath: 'briefs/verify-02.md',
    });
    const statuses: ReviewGroupArtifactStatus[] = state.groups.map(
      ({ id }) => ({
        group: id,
        review: 'missing',
        verify: 'missing',
        roundFiles: [1],
        assignedCount: null,
        briefPresent: true,
        verifyBriefPresent: false,
      }),
    );
    expect(
      planNextHandoffs({ state, paths, statuses }).next.map(
        ({ group }) => group,
      ),
    ).toEqual(['01']);
    group.validated.review = {
      round: 1,
      complete: true,
      sha256: 'review-hash',
    };
    statuses[0] = {
      ...statuses[0]!,
      review: 'trusted',
      verify: 'trusted',
      assignedCount: 0,
    };
    expect(
      planNextHandoffs({ state, paths, statuses }).next.map(
        ({ group }) => group,
      ),
    ).toEqual(['02']);
  });

  it.each(['documents-only', 'source-dirty'] as const)(
    'seals %s without actor work',
    (worktree) => {
      const { state, paths } = buildReviewHandoffFixture(
        portableJoin(tmp(), 'handoff-dirty'),
      );
      state.scope.worktree = worktree;
      expect(planNextHandoffs({ state, paths, statuses: [] })).toEqual({
        next: [],
        sealReady: true,
      });
    },
  );

  it('treats a hash-bound rounds 0 group as complete', () => {
    const { state, paths } = buildReviewHandoffFixture(
      portableJoin(tmp(), 'handoff-zero'),
    );
    state.groups[0]!.rounds = 0;
    state.groups[0]!.validated.review = {
      round: 0,
      complete: true,
      sha256: 'review-hash',
    };
    expect(
      planNextHandoffs({
        state,
        paths,
        statuses: [
          {
            group: '01',
            review: 'trusted',
            verify: 'trusted',
            roundFiles: [],
            assignedCount: 0,
            briefPresent: false,
            verifyBriefPresent: true,
          },
        ],
      }),
    ).toEqual({ next: [], sealReady: true });
  });
});
