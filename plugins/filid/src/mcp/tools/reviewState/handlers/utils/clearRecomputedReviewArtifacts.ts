import { rmSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  removeFileIfExistsSync,
} from '@ogham/cross-platform';

import type { ReviewStatePaths } from '../../state/reviewStateTypes.js';

/**
 * Clear derived artifacts for an evidence-missing resume while preserving opinions.
 * @param paths Canonical paths whose diff, brief, and session outputs are rebuilt.
 * @returns Nothing after the contained derived surfaces are absent.
 */
export function clearRecomputedReviewArtifacts(paths: ReviewStatePaths): void {
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.diffsDirectory);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.briefsDirectory);
  assertNoSymlinkDescendantsSync(paths.reviewDirectory, paths.sessionPath);
  rmSync(paths.diffsDirectory, { recursive: true, force: true });
  rmSync(paths.briefsDirectory, { recursive: true, force: true });
  removeFileIfExistsSync(paths.sessionPath);
}
