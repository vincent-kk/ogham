import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewStatePaths } from '../../state/reviewStateTypes.js';

/**
 * Copy validated opinion bytes without rewriting their source identity.
 * @param originPaths Immutable origin artifact directory.
 * @param targetPaths Fresh isolated generation directory.
 * @param origin Completed origin group whose IDs are retained in the target.
 * @returns Nothing after required opinion and available historical round bytes are copied.
 * @throws When the validated pair changed while prepare was collecting inputs.
 */
export function carryReviewGroupArtifacts(
  originPaths: ReviewStatePaths,
  targetPaths: ReviewStatePaths,
  origin: ReviewGroup,
): void {
  const required = [
    [origin.opinionPath, origin.validated.review?.sha256],
    [origin.verifyPath, origin.validated.verify?.sha256],
  ] as const;
  for (const [path, digest] of required) {
    const bytes = readUtf8FileIfExistsSync(
      resolveReviewArtifactPath(originPaths, path),
    );
    if (bytes === null || computeReviewArtifactHash(bytes) !== digest)
      throw new Error('review origin artifact changed during preparation');
    writeFileAtomicallySync(
      resolveReviewArtifactPath(targetPaths, path),
      bytes,
    );
  }
  for (const path of [
    origin.verifyBriefPath,
    ...Array.from(
      { length: origin.validated.review?.round ?? 0 },
      (_, index) => `opinions/review-${origin.id}.r${index + 1}.json`,
    ),
  ]) {
    const bytes = readUtf8FileIfExistsSync(
      resolveReviewArtifactPath(originPaths, path),
    );
    if (bytes !== null)
      writeFileAtomicallySync(
        resolveReviewArtifactPath(targetPaths, path),
        bytes,
      );
  }
}
