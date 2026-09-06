import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
  withFileLockSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_JSON_INDENT,
  REVIEW_STATE_JSON_TRAILING_NEWLINE,
} from '../../../../constants/reviewState.js';

import { hasCompletePreparedArtifacts } from './hasCompletePreparedArtifacts.js';
import { resolveReviewGenerationPaths } from './resolveReviewGenerationPaths.js';
import { ReviewStateRecordSchema } from './reviewStateRecordSchema.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from './reviewStateTypes.js';

/**
 * Publish fully staged artifacts only if the observed active state is unchanged.
 * @param paths Paths of the new isolated generation, never the origin directory.
 * @param state Complete new prepared state whose artifacts have already been staged.
 * @param expectedState Exact state bytes observed before asynchronous preparation.
 * @returns Nothing after the origin snapshot and active state are persisted.
 * @throws On invalid paths/state, lock timeout, a reused generation or a revision conflict.
 */
export function publishReviewGeneration(
  paths: ReviewStatePaths,
  state: ReviewStateRecord,
  expectedState: string | null,
): void {
  if (
    !state.generationId ||
    state.phase !== 'prepared' ||
    state.projectRoot !== paths.projectRoot
  )
    throw new Error('publication requires a prepared review generation');
  ReviewStateRecordSchema.parse(state);
  const canonical = resolveReviewGenerationPaths(paths, state.generationId);
  if (
    canonical.reviewDirectory !== paths.reviewDirectory ||
    canonical.statePath !== paths.statePath
  )
    throw new Error('review generation paths do not match state');
  const snapshotPath = resolveContainedPath(
    paths.reviewDirectory,
    'generation-state.json',
  );
  const originPath = resolveContainedPath(
    paths.reviewDirectory,
    'origin-state.json',
  );
  for (const path of [snapshotPath, originPath, `${paths.statePath}.lock`])
    assertNoSymlinkDescendantsSync(paths.projectRoot, path);
  const bytes = `${JSON.stringify(state, null, REVIEW_STATE_JSON_INDENT)}${REVIEW_STATE_JSON_TRAILING_NEWLINE}`;
  const result = withFileLockSync(paths.statePath, () => {
    if (readUtf8FileIfExistsSync(paths.statePath) !== expectedState)
      throw new Error('review state changed during generation preparation');
    if (!hasCompletePreparedArtifacts(paths, state))
      throw new Error('required review generation artifacts are missing');
    if (readUtf8FileIfExistsSync(snapshotPath) !== null)
      throw new Error('review generation was already published');
    if (expectedState !== null)
      writeFileAtomicallySync(originPath, expectedState);
    writeFileAtomicallySync(snapshotPath, bytes);
    writeFileAtomicallySync(paths.statePath, bytes);
  });
  if (!result.acquired)
    throw new Error('review generation publication lock timed out');
}
