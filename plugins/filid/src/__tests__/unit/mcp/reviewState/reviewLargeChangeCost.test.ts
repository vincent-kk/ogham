import { describe, expect, it } from 'vitest';

import { REVIEW_EFFORT_ROUNDS } from '../../../../constants/reviewState.js';
import { renderOpinionSkeleton } from '../../../../mcp/tools/reviewState/brief/renderOpinionSkeleton.js';
import { renderReviewBrief } from '../../../../mcp/tools/reviewState/brief/renderReviewBrief.js';
import { retuneReviewGroups } from '../../../../mcp/tools/reviewState/handlers/utils/retuneReviewGroups.js';
import { selectReviewEffort } from '../../../../mcp/tools/reviewState/handlers/utils/selectReviewEffort.js';

import { buildLargeReviewBriefInputs } from './helpers/buildLargeReviewBriefInputs.js';

/** Fixed pre-reduction byte baseline for the canonical reviewer-brief cost bound. */
const BASELINE_REVIEW_BRIEF_BYTES = 981364;

describe('large change deterministic cost bound', () => {
  it('reduces fixed 46-group reviewer briefs by at least fifteen percent', () => {
    const inputs = buildLargeReviewBriefInputs();
    const bytes = inputs.reduce(
      (total, input) => total + Buffer.byteLength(renderReviewBrief(input)),
      0,
    );
    const skeletonBytes = inputs.reduce(
      (total, input) =>
        total +
        Buffer.byteLength(renderOpinionSkeleton(input.group, input.sourceHash)),
      0,
    );
    console.log(`REVIEW_LARGE_BRIEF_BYTES=${bytes}`);
    console.log(
      `REVIEW_LARGE_SKELETON_BYTES=${skeletonBytes} COMBINED_BYTES=${bytes + skeletonBytes}`,
    );
    expect(inputs).toHaveLength(46);
    expect(bytes).toBeLessThanOrEqual(BASELINE_REVIEW_BRIEF_BYTES * 0.85);
    expect(bytes + skeletonBytes).toBeLessThan(BASELINE_REVIEW_BRIEF_BYTES);
  });
  it('halves maximum reviewer handoffs while keeping every assigned unit', () => {
    const groups = buildLargeReviewBriefInputs().map((input) => input.group);
    const policy = selectReviewEffort('auto', groups.length, 16);
    const auto = retuneReviewGroups(
      groups,
      REVIEW_EFFORT_ROUNDS[policy.effort],
    );
    expect(auto.reduce((sum, group) => sum + group.rounds, 0)).toBe(46);
    expect(groups.reduce((sum, group) => sum + group.rounds, 0)).toBe(92);
    expect(auto.flatMap((group) => group.units)).toEqual(
      groups.flatMap((group) => group.units),
    );
    expect(auto.map((group) => group.id)).toEqual(
      groups.map((group) => group.id),
    );
  });
});
