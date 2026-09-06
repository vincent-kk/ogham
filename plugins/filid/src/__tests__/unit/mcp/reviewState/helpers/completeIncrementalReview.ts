import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import type { ReviewStatePayload } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './buildReviewOpinion.js';
import { buildVerifyOpinion } from './buildVerifyOpinion.js';

/**
 * Drive real broker handoffs through validation without manufacturing receipts.
 * @param projectRoot Temporary Git fixture prepared with explicit actorContext.
 * @returns The final checkpoint after every executable handoff is validated.
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
    const request = {
      action: 'context' as const,
      projectRoot,
      generationId: next.context!.generationId,
      token: next.context!.token,
      group: next.group,
      kind: next.kind,
      ...(next.round === undefined ? {} : { round: next.round }),
    };
    let offset: number | null = 0;
    while (offset !== null) {
      const page: ReviewStatePayload = await handleReviewState({
        ...request,
        operation: 'brief',
        offset,
      });
      offset = page.data.context!.nextOffset;
    }
    const opinion =
      next.kind === 'review'
        ? buildReviewOpinion(
            state,
            state.groups.find((group) => group.id === next.group)!,
            next.round,
          )
        : buildVerifyOpinion(state, next.group, []);
    const result = await handleReviewState({
      ...request,
      operation: 'submit',
      opinion,
    });
    if (result.summary.ok !== true)
      throw new Error(JSON.stringify(result.data.problems));
  }
  throw new Error('review fixture exceeded its handoff bound');
}
