import { writeFileAtomicallySync } from '@ogham/cross-platform';

import {
  REVIEW_OPINION_SCHEMA_VERSION,
  REVIEW_STATE_JSON_INDENT,
  REVIEW_STATE_JSON_TRAILING_NEWLINE,
} from '../../../../../constants/reviewState.js';
import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewStatePaths } from '../../state/reviewStateTypes.js';

/**
 * Write an empty complete verifier artifact and bind its exact persisted bytes.
 * @param paths Contained branch paths owning the output opinion.
 * @param group Complete trusted review with no independently assigned findings.
 * @param sourceHash Prepared committed-source identity copied into the opinion.
 * @returns A new group with verify validation bound to its review hash.
 * @throws When the review is incomplete or the output path cannot be written.
 */
export function writeAutoVerifyOpinion(
  paths: ReviewStatePaths,
  group: ReviewGroup,
  sourceHash: string,
): ReviewGroup {
  const review = group.validated.review;
  if (!review?.complete)
    throw new Error(
      `Auto-verification requires a complete review for ${group.id}`,
    );
  const bytes =
    JSON.stringify(
      {
        schema: REVIEW_OPINION_SCHEMA_VERSION,
        group: group.id,
        state: 'COMPLETE',
        sourceHash,
        decisions: [],
        observations: [],
        checked: [...new Set(group.units.map(({ path }) => path))],
      },
      null,
      REVIEW_STATE_JSON_INDENT,
    ) + REVIEW_STATE_JSON_TRAILING_NEWLINE;
  writeFileAtomicallySync(
    resolveReviewArtifactPath(paths, group.verifyPath),
    bytes,
  );
  return {
    ...group,
    validated: {
      review,
      verify: {
        sha256: computeReviewArtifactHash(bytes),
        reviewSha256: review.sha256,
      },
    },
  };
}
