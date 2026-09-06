import {
  REVIEW_GROUP_ADAPTIVE_FILE_LIMIT,
  REVIEW_GROUP_FILE_LIMIT,
} from '../../../../../constants/reviewState.js';
import type { ReviewUnit } from '../../state/reviewGroupTypes.js';

/**
 * Size normal groups to their changed-line density while bounding file overhead.
 * @param units Complete review units; chunks keep independent groups.
 * @param churnLimit Positive maximum changed-line count per group.
 * @returns A file cap between the configured automatic floor and ceiling.
 */
export function resolveReviewGroupFileLimit(
  units: readonly ReviewUnit[],
  churnLimit: number,
): number {
  const normal = units.filter((unit) => unit.chunk === null);
  const churn = normal.reduce((total, unit) => total + unit.churn, 0);
  const lineGroups = Math.max(1, Math.ceil(churn / churnLimit));
  return Math.min(
    REVIEW_GROUP_ADAPTIVE_FILE_LIMIT,
    Math.max(REVIEW_GROUP_FILE_LIMIT, Math.ceil(normal.length / lineGroups)),
  );
}
