import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewEffortMetadata } from '../../state/reviewStateTypes.js';

/**
 * Render the policy facts shared by fresh sessions and metadata-only resumes.
 * @param policy Optional selection metadata from a readable state v2.
 * @param groups Prepared groups whose rounds bound reviewer handoffs.
 * @returns Flat frontmatter lines without effort or session identity fields.
 */
export function renderReviewPolicyMetadata(
  policy: ReviewEffortMetadata,
  groups: readonly ReviewGroup[],
): string[] {
  return [
    ...(policy.effortMode === undefined
      ? []
      : [`effort_mode: ${policy.effortMode}`]),
    ...(policy.effortReason === undefined
      ? []
      : [`effort_reason: ${policy.effortReason}`]),
    ...(policy.autoLowEffortGroupThreshold === undefined
      ? []
      : [
          `auto_low_effort_group_threshold: ${policy.autoLowEffortGroupThreshold}`,
        ]),
    `reviewable_groups: ${groups.filter((group) => group.rounds > 0).length}`,
    `max_reviewer_handoffs: ${groups.reduce((total, group) => total + group.rounds, 0)}`,
  ];
}
