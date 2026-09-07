import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

import {
  REVIEW_CHANGE_CONTEXT_FILE_LIMIT,
  REVIEW_STATE_ERROR_MESSAGES,
} from '../../../../constants/reviewState.js';

/**
 * Read one bounded untrusted change summary from an absolute regular-file path.
 * @param path Absolute final path to inspect without following a final symlink.
 * @returns UTF-8 file contents read once after metadata validation.
 * @throws When the path is invalid, unreadable, non-regular, or over the byte limit.
 */
export function readChangeContextFile(path: string): string {
  if (!isAbsolute(path))
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_PATH_INVALID);
  let stats: ReturnType<typeof lstatSync>;
  try {
    stats = lstatSync(path);
  } catch {
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_PATH_INVALID);
  }
  if (!stats.isFile() || stats.isSymbolicLink())
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_PATH_INVALID);
  if (stats.size > REVIEW_CHANGE_CONTEXT_FILE_LIMIT)
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_FILE_TOO_LARGE);
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_PATH_INVALID);
  }
}
