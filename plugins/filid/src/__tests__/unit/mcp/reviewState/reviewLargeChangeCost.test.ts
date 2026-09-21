import { describe, expect, it } from 'vitest';

import { REVIEW_EFFORT_ROUNDS } from '../../../../constants/reviewState.js';
import { renderOpinionSkeleton } from '../../../../mcp/tools/reviewState/brief/renderOpinionSkeleton.js';
import { renderReviewBrief } from '../../../../mcp/tools/reviewState/brief/renderReviewBrief.js';
import { retuneReviewGroups } from '../../../../mcp/tools/reviewState/handlers/utils/retuneReviewGroups.js';
import { selectReviewEffort } from '../../../../mcp/tools/reviewState/handlers/utils/selectReviewEffort.js';

import { buildLargeReviewBriefInputs } from './helpers/buildLargeReviewBriefInputs.js';

/**
 * Fixed pre-reduction byte baseline of the 46 canonical reviewer briefs without
 * their rule bodies. It is the 981,364-byte pre-reduction brief total minus the
 * 529,736 bytes that the rule bodies selected for these briefs contributed as
 * the rule documents stood when that total was taken; a rule contribution is
 * the difference between rendering with the selected rules and with `rules: []`,
 * so the `none` placeholder counts as overhead. Rule bodies are review content,
 * not brief structure, so the bound excludes them.
 */
const BASELINE_REVIEW_BRIEF_OVERHEAD_BYTES = 451628;

describe('large change deterministic cost bound', () => {
  it('reduces fixed 46-group reviewer brief overhead by at least fifteen percent', () => {
    const inputs = buildLargeReviewBriefInputs();
    const bytes = inputs.reduce(
      (total, input) => total + Buffer.byteLength(renderReviewBrief(input)),
      0,
    );
    const overheadBytes = inputs.reduce(
      (total, input) =>
        total + Buffer.byteLength(renderReviewBrief({ ...input, rules: [] })),
      0,
    );
    const skeletonBytes = inputs.reduce(
      (total, input) =>
        total +
        Buffer.byteLength(renderOpinionSkeleton(input.group, input.sourceHash)),
      0,
    );
    console.log(
      `REVIEW_LARGE_BRIEF_BYTES=${bytes} REVIEW_LARGE_BRIEF_OVERHEAD_BYTES=${overheadBytes}`,
    );
    console.log(
      `REVIEW_LARGE_SKELETON_BYTES=${skeletonBytes} COMBINED_OVERHEAD_BYTES=${overheadBytes + skeletonBytes}`,
    );
    expect(inputs).toHaveLength(46);
    expect(overheadBytes).toBeLessThanOrEqual(
      BASELINE_REVIEW_BRIEF_OVERHEAD_BYTES * 0.85,
    );
    expect(overheadBytes + skeletonBytes).toBeLessThan(
      BASELINE_REVIEW_BRIEF_OVERHEAD_BYTES,
    );
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
