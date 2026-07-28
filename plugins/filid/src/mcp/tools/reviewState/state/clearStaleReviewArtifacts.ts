import { rmSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  removeFileIfExistsSync,
} from '@ogham/cross-platform/filesystem';
import { resolveContainedPath } from '@ogham/cross-platform/paths';

import {
  REVIEW_STATE_STALE_ARTIFACT_DIRECTORY_NAMES,
  REVIEW_STATE_STALE_ARTIFACT_FILE_NAMES,
} from '../../../../constants/reviewState.js';

import type { ReviewStatePaths } from './reviewStateTypes.js';

export function clearStaleReviewArtifacts(paths: ReviewStatePaths): void {
  for (const fileName of REVIEW_STATE_STALE_ARTIFACT_FILE_NAMES) {
    const artifactPath = resolveContainedPath(paths.reviewDirectory, fileName);
    assertNoSymlinkDescendantsSync(paths.projectRoot, artifactPath);
    removeFileIfExistsSync(artifactPath);
  }

  for (const directoryName of REVIEW_STATE_STALE_ARTIFACT_DIRECTORY_NAMES) {
    const artifactPath = resolveContainedPath(
      paths.reviewDirectory,
      directoryName,
    );
    assertNoSymlinkDescendantsSync(paths.projectRoot, artifactPath);
    rmSync(artifactPath, { recursive: true, force: true });
  }
}
