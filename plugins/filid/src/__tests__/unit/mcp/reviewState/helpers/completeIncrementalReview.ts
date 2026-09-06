import { writeFileSync } from 'node:fs';

import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import type { ReviewStatePayload } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './buildReviewOpinion.js';
import { buildVerifyOpinion } from './buildVerifyOpinion.js';

/**
 * Drive ordinary reviewer file writes through the public validation handoff.
 * @param projectRoot Disposable prepared Git fixture.
 * @returns Checkpoint after every executable assignment has been validated.
 * @throws On failed validation or an unexpectedly unbounded handoff loop.
 */
export async function completeIncrementalReview(
  projectRoot: string,
): Promise<ReviewStatePayload> {
  for (let count = 0; count < 200; count++) {
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot,
    });
    const next = checkpoint.data.next?.[0];
    if (!next) return checkpoint;
    const state = checkpoint.data.state!;
    const opinion =
      next.kind === 'review'
        ? buildReviewOpinion(
            state,
            state.groups.find((group) => group.id === next.group)!,
            next.round,
          )
        : buildVerifyOpinion(state, next.group, []);
    writeFileSync(next.outputPath, JSON.stringify(opinion));
    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      group: next.group,
      kind: next.kind,
      ...(next.round === undefined ? {} : { round: next.round }),
    });
    if (result.summary.ok !== true)
      throw new Error(JSON.stringify(result.data.problems));
  }
  throw new Error('review fixture exceeded its handoff bound');
}
