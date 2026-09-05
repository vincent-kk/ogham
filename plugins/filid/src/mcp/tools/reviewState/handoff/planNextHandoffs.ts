import { portableJoin } from '@ogham/cross-platform';

import { REVIEW_STATE_PHASES } from '../../../../constants/reviewState.js';
import type {
  ReviewHandoff,
  ReviewHandoffPlan,
  ReviewStatePaths,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';

import type { ReviewGroupArtifactStatus } from './handoffTypes.js';

/**
 * Plan actor work from normalized state and artifact observations without I/O.
 * @param input Prepared state, contained paths, and post-effect trust facts.
 * @returns Runnable handoffs and whether every group can proceed to sealing.
 */
export function planNextHandoffs(input: {
  /** Prepared session after the caller has completed its authorized effects. */
  state: ReviewStateRecord;
  /** Canonical review root used to make every handoff path absolute. */
  paths: ReviewStatePaths;
  /** Current group trust facts from the artifact-reading effect boundary. */
  statuses: readonly ReviewGroupArtifactStatus[];
}): ReviewHandoffPlan {
  const { state, paths } = input;
  if (
    state.phase === REVIEW_STATE_PHASES.SEALED ||
    state.scope.worktree === 'documents-only' ||
    state.scope.worktree === 'source-dirty'
  )
    return { next: [], sealReady: true };
  const statuses = new Map(
    input.statuses.map((status) => [status.group, status]),
  );
  const complete = new Set(
    state.groups
      .filter(
        (group) =>
          group.validated.review?.complete &&
          statuses.get(group.id)?.review === 'trusted' &&
          statuses.get(group.id)?.verify === 'trusted',
      )
      .map(({ id }) => id),
  );
  const next: ReviewHandoff[] = [];
  for (const group of state.groups) {
    if (
      complete.has(group.id) ||
      group.dependsOn.some((id) => !complete.has(id))
    )
      continue;
    const status = statuses.get(group.id);
    const review = group.validated.review;
    if (
      group.rounds > 0 &&
      (status?.review !== 'trusted' || !review?.complete)
    ) {
      const round =
        status?.review === 'trusted' ? review!.round + 1 : (review?.round ?? 1);
      next.push({
        kind: 'review',
        group: group.id,
        round,
        briefPath: portableJoin(paths.reviewDirectory, group.briefPath),
        outputPath: portableJoin(
          paths.reviewDirectory,
          `opinions/review-${group.id}.r${round}.json`,
        ),
        priorOpinionPath:
          round >= 2
            ? portableJoin(paths.reviewDirectory, group.opinionPath)
            : null,
      });
    } else if (
      status?.review === 'trusted' &&
      review?.complete &&
      (status.assignedCount ?? 0) > 0
    )
      next.push({
        kind: 'verify',
        group: group.id,
        briefPath: portableJoin(paths.reviewDirectory, group.verifyBriefPath),
        outputPath: portableJoin(paths.reviewDirectory, group.verifyPath),
        priorOpinionPath: null,
      });
  }
  return { next, sealReady: complete.size === state.groups.length };
}
