import { resolveContainedPath } from '@ogham/cross-platform';

import { REVIEW_STATE_DIRECTORY_NAMES } from '../../../../constants/reviewState.js';

/**
 * Where one generation's artifacts live under its branch directory.
 *
 * The one place that rule is written: a caller that joins the segments itself
 * drifts from this one the moment the layout changes, which is how
 * `facts.json` came to sit outside the generation it belonged to.
 * @param branchDirectory Absolute branch-scoped review directory.
 * @param generationId The generation whose directory is wanted.
 * @returns The absolute generation directory, contained under the branch.
 */
export function resolveGenerationDirectory(
  branchDirectory: string,
  generationId: string,
): string {
  return resolveContainedPath(
    branchDirectory,
    REVIEW_STATE_DIRECTORY_NAMES.GENERATIONS,
    generationId,
  );
}
