/**
 * Build the canonical relative path for one raw reviewer round.
 *
 * @param group - At-least-two-digit prepared group identifier.
 * @param round - One-based reviewer round number.
 * @returns Review-directory-relative opinion artifact path.
 */
export function roundReviewOpinionPath(group: string, round: number): string {
  return `opinions/review-${group}.r${String(round)}.json`;
}
