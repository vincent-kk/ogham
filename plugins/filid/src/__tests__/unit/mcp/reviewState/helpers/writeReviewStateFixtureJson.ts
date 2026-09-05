import { writeFileAtomicallySync } from '@ogham/cross-platform';

import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { resolveReviewStateFixtureArtifact } from './resolveReviewStateFixtureArtifact.js';

/**
 * Write one JSON value to a canonical review-state fixture artifact.
 *
 * @param projectRoot - Absolute temporary repository root.
 * @param state - Prepared state carrying the normalized branch key.
 * @param relativePath - Review-directory-relative artifact path.
 * @param value - JSON-compatible fixture value to serialize.
 * @returns Nothing.
 */
export function writeReviewStateFixtureJson(
  projectRoot: string,
  state: ReviewStateRecord,
  relativePath: string,
  value: unknown,
): void {
  writeFileAtomicallySync(
    resolveReviewStateFixtureArtifact(
      projectRoot,
      state.normalizedBranch,
      relativePath,
    ),
    `${JSON.stringify(value)}\n`,
  );
}
