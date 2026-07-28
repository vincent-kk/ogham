import {
  REVIEW_STATE_ERROR_MESSAGES,
  REVIEW_STATE_GIT,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../constants/reviewState.js';
import type { ReviewHeadTreeEntry } from '../state/reviewStateTypes.js';

import { executeReviewGit } from './executeReviewGit.js';

export async function readHeadTreeEntries(
  projectRoot: string,
  changedPaths: readonly string[],
): Promise<Map<string, ReviewHeadTreeEntry>> {
  if (changedPaths.length === 0) return new Map();

  const output = await executeReviewGit(projectRoot, [
    REVIEW_STATE_GIT.LS_TREE,
    ...REVIEW_STATE_GIT_ARGUMENTS.HEAD_TREE,
    REVIEW_STATE_GIT.HEAD,
    REVIEW_STATE_GIT.END_OF_OPTIONS,
    ...changedPaths,
  ]);
  const entries = new Map<string, ReviewHeadTreeEntry>();

  for (const record of output.split(REVIEW_STATE_GIT.RECORD_SEPARATOR)) {
    if (!record) continue;
    const separatorIndex = record.indexOf(
      REVIEW_STATE_GIT.METADATA_PATH_SEPARATOR,
    );
    if (separatorIndex < 0)
      throw new Error(REVIEW_STATE_ERROR_MESSAGES.TREE_RECORD_INVALID);
    const [mode, type, objectHash] = record
      .slice(0, separatorIndex)
      .split(REVIEW_STATE_GIT.IDENTITY_SEPARATOR);
    if (!mode || !type || !objectHash)
      throw new Error(REVIEW_STATE_ERROR_MESSAGES.TREE_IDENTITY_INCOMPLETE);
    entries.set(record.slice(separatorIndex + 1), {
      objectHash,
      identity: [mode, type, objectHash].join(
        REVIEW_STATE_GIT.IDENTITY_SEPARATOR,
      ),
    });
  }

  return entries;
}
