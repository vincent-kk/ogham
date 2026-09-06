import type {
  ReviewEffort,
  ReviewEffortMetadata,
  ReviewEffortMode,
} from '../../state/reviewStateTypes.js';

/**
 * Select a bounded round policy without changing group composition or model tiers.
 * @param mode Validated explicit, configured, or default requested effort.
 * @param reviewableGroups Number of groups with a positive reviewer round budget.
 * @param threshold Positive configured boundary for automatic low effort.
 * @returns Effective effort and the complete observable selection metadata.
 */
export function selectReviewEffort(
  mode: ReviewEffortMode,
  reviewableGroups: number,
  threshold: number,
): { effort: ReviewEffort } & Required<ReviewEffortMetadata> {
  const large = reviewableGroups >= threshold;
  return {
    effort: mode === 'auto' ? (large ? 'low' : 'medium') : mode,
    effortMode: mode,
    effortReason:
      mode === 'auto' ? (large ? 'auto-large' : 'auto-standard') : 'fixed',
    autoLowEffortGroupThreshold: threshold,
  };
}
