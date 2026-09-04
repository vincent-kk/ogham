import { REVIEW_STATE_GIT } from '../../../../../constants/reviewState.js';
import { chunkUnits } from '../../chunk/chunkUnits.js';
import type { RenderedReviewUnit } from '../../diff/reviewUnitDiffTypes.js';
import { executeReviewGit } from '../../hash/executeReviewGit.js';
import type { ReviewScopeFile } from '../../state/reviewStateTypes.js';

/** Inputs required to materialize every reviewable committed file diff. */
interface CollectRenderedReviewUnitsInput {
  /** Absolute repository root used as the Git working directory. */
  projectRoot: string;
  /** Merge-base commit anchoring the reviewed range. */
  baseCommit: string;
  /** Complete changed-file roster, including skipped paths. */
  files: readonly ReviewScopeFile[];
  /** Maximum changed-line churn allowed in one review unit. */
  groupChurnLimit: number;
}

/**
 * Read and deterministically chunk each reviewable committed file diff.
 * @param input Repository identity, roster, and effective unit churn bound.
 * @returns Rendered review units in roster and hunk order.
 */
export async function collectRenderedReviewUnits(
  input: CollectRenderedReviewUnitsInput,
): Promise<RenderedReviewUnit[]> {
  const rendered: RenderedReviewUnit[] = [];
  const range = `${input.baseCommit}${REVIEW_STATE_GIT.RANGE_SEPARATOR}${REVIEW_STATE_GIT.HEAD}`;
  for (const file of input.files) {
    if (file.skipReason !== null) continue;
    const diffText = await executeReviewGit(input.projectRoot, [
      REVIEW_STATE_GIT.DIFF,
      '--no-renames',
      range,
      REVIEW_STATE_GIT.END_OF_OPTIONS,
      file.path,
    ]);
    rendered.push(...chunkUnits(file, diffText, input.groupChurnLimit));
  }
  return rendered;
}
