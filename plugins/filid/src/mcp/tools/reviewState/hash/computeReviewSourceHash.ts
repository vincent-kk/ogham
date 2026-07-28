import { createHash } from 'node:crypto';

import {
  REVIEW_STATE_DELETED_FILE_HASH,
  REVIEW_STATE_ERROR_MESSAGES,
  REVIEW_STATE_GIT,
  REVIEW_STATE_HASH_ALGORITHM,
  REVIEW_STATE_HASH_ENCODING,
  REVIEW_STATE_HASH_SEPARATOR,
  REVIEW_STATE_HASH_VERSION,
} from '../../../../constants/reviewState.js';
import type { ReviewSourceSnapshot } from '../state/reviewStateTypes.js';

import { executeReviewGit } from './executeReviewGit.js';
import { readChangedPaths } from './readChangedPaths.js';
import { readHeadTreeEntries } from './readHeadTreeEntries.js';

export async function computeReviewSourceHash(
  projectRoot: string,
  baseRef: string,
): Promise<ReviewSourceSnapshot> {
  const baseCommit = (
    await executeReviewGit(projectRoot, [
      REVIEW_STATE_GIT.MERGE_BASE,
      REVIEW_STATE_GIT.END_OF_OPTIONS,
      baseRef,
      REVIEW_STATE_GIT.HEAD,
    ])
  ).trim();
  if (!baseCommit)
    throw new Error(
      `${REVIEW_STATE_ERROR_MESSAGES.MERGE_BASE_MISSING}: "${baseRef}"`,
    );

  const changedPaths = await readChangedPaths(projectRoot, baseCommit);
  const headEntries = await readHeadTreeEntries(projectRoot, changedPaths);
  const fileHashEntries: Array<[string, string]> = [];
  const hash = createHash(REVIEW_STATE_HASH_ALGORITHM);
  hash.update(REVIEW_STATE_HASH_VERSION);
  hash.update(REVIEW_STATE_HASH_SEPARATOR);
  hash.update(baseCommit);
  hash.update(REVIEW_STATE_HASH_SEPARATOR);

  for (const changedPath of changedPaths) {
    const treeEntry = headEntries.get(changedPath);
    const identity = treeEntry?.identity ?? REVIEW_STATE_DELETED_FILE_HASH;
    fileHashEntries.push([
      changedPath,
      treeEntry?.objectHash ?? REVIEW_STATE_DELETED_FILE_HASH,
    ]);
    hash.update(changedPath);
    hash.update(REVIEW_STATE_HASH_SEPARATOR);
    hash.update(identity);
    hash.update(REVIEW_STATE_HASH_SEPARATOR);
  }

  return {
    baseCommit,
    sourceHash: hash.digest(REVIEW_STATE_HASH_ENCODING),
    fileHashes: Object.fromEntries(fileHashEntries),
  };
}
