import { existsSync, renameSync } from 'node:fs';

import { resolveContainedPath } from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
  REVIEW_STATE_REPLACED_FILE_PREFIX,
} from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

/** How many archived states one branch directory may hold before prepare gives up naming them. */
const ARCHIVE_LIMIT = 1000;

/**
 * Move an unusable state file aside, bytes untouched, so nothing is lost.
 *
 * The archive sits in the branch directory beside the state file and is
 * numbered, so repeated replacements keep every earlier record; only
 * `cleanup` ever deletes a review directory.
 *
 * @param branchDirectory Absolute branch-level review directory holding the state file.
 * @param statePath Absolute state file to move; it must exist.
 * @returns The absolute path the bytes now live at.
 * @throws A `review-state-archive-failed` diagnostic when the move fails or no free archive name is available.
 */
export function archiveReplacedReviewState(
  branchDirectory: string,
  statePath: string,
): string {
  for (let index = 1; index <= ARCHIVE_LIMIT; index += 1) {
    const candidate = resolveContainedPath(
      branchDirectory,
      `${REVIEW_STATE_REPLACED_FILE_PREFIX}${index}.json`,
    );
    if (existsSync(candidate)) continue;
    try {
      renameSync(statePath, candidate);
    } catch (error) {
      throw archiveFailed(
        branchDirectory,
        `${statePath} could not be moved to ${candidate}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return candidate;
  }
  throw archiveFailed(
    branchDirectory,
    `${branchDirectory} already holds ${ARCHIVE_LIMIT} archived states, so ${statePath} has no free name`,
  );
}

/**
 * Report an archive that could not happen, with the directory to act on.
 * @param branchDirectory Directory the archive would have been written in.
 * @param detail What failed, including the underlying message.
 * @returns The diagnostic error to throw; nothing has been written.
 */
function archiveFailed(
  branchDirectory: string,
  detail: string,
): ToolDiagnosticError {
  return new ToolDiagnosticError(
    REVIEW_STATE_DIAGNOSTIC_CODES.STATE_ARCHIVE_FAILED,
    `${detail}; the review directory is ${branchDirectory}`,
    REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.STATE_ARCHIVE_FAILED,
  );
}
