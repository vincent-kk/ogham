import {
  removeFileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { renderOpinionSkeleton } from '../../brief/renderOpinionSkeleton.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewStatePaths } from '../../state/reviewStateTypes.js';

/**
 * Drop one group's stored review rounds so the next handoff reviews it again.
 *
 * Removes the merged opinion and writes a fresh round-1 skeleton, which is the
 * only repair available when the stored rounds cannot be trusted; the group's
 * files and its assignment stay as prepared.
 *
 * @param paths Contained paths of the generation that owns the artifacts.
 * @param group Group whose validations and merged opinion are discarded.
 * @param sourceHash Committed source identity the new skeleton binds to.
 * @returns The same group with its validations cleared.
 */
export function discardReviewGroupRounds(
  paths: ReviewStatePaths,
  group: ReviewGroup,
  sourceHash: string,
): ReviewGroup {
  removeFileIfExistsSync(resolveReviewArtifactPath(paths, group.opinionPath));
  writeFileAtomicallySync(
    resolveReviewArtifactPath(paths, group.skeletonPath),
    renderOpinionSkeleton(group, sourceHash, 1),
  );
  return { ...group, validated: { review: null, verify: null } };
}
