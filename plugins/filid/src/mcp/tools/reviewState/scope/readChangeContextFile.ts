import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

import {
  REVIEW_CHANGE_CONTEXT_FILE_LIMIT,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
  REVIEW_STATE_ERROR_MESSAGES,
} from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

/** Build the path-invalid diagnostic error shared by every rejection below. */
function pathInvalid(): ToolDiagnosticError {
  return new ToolDiagnosticError(
    REVIEW_STATE_DIAGNOSTIC_CODES.CHANGE_CONTEXT_PATH_INVALID,
    REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_PATH_INVALID,
    REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.CHANGE_CONTEXT_PATH_INVALID,
  );
}

/**
 * Read one bounded untrusted change summary from an absolute regular-file path.
 * @param path Absolute final path to inspect without following a final symlink.
 * @returns UTF-8 file contents read once after metadata validation.
 * @throws When the path is invalid, unreadable, non-regular, or over the byte limit.
 */
export function readChangeContextFile(path: string): string {
  if (!isAbsolute(path)) throw pathInvalid();
  let stats: ReturnType<typeof lstatSync>;
  try {
    stats = lstatSync(path);
  } catch {
    throw pathInvalid();
  }
  if (!stats.isFile() || stats.isSymbolicLink()) throw pathInvalid();
  if (stats.size > REVIEW_CHANGE_CONTEXT_FILE_LIMIT)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.CHANGE_CONTEXT_TOO_LARGE,
      REVIEW_STATE_ERROR_MESSAGES.CHANGE_CONTEXT_FILE_TOO_LARGE,
      REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.CHANGE_CONTEXT_TOO_LARGE,
    );
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw pathInvalid();
  }
}
