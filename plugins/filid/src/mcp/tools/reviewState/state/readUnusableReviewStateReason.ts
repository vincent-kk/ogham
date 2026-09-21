import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_VALIDATION_POLICY_VERSION,
} from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

import { readReviewState } from './readReviewState.js';

/** Why a stored review state cannot carry a verdict, as the code the caller reports. */
export type UnusableReviewStateReason =
  | typeof REVIEW_STATE_DIAGNOSTIC_CODES.STATE_SCHEMA_MISMATCH
  | typeof REVIEW_STATE_DIAGNOSTIC_CODES.STATE_INVALID
  | typeof REVIEW_STATE_DIAGNOSTIC_CODES.INCREMENTAL_BOOTSTRAP_REQUIRED
  | typeof REVIEW_STATE_DIAGNOSTIC_CODES.VALIDATION_POLICY_OUTDATED;

/**
 * Judge a stored review state before prepare reads anything else.
 *
 * Unreadable bytes, another schema version, a record no current action can
 * resume, and evidence validated under an unsupported policy all mean the same
 * thing: this state can produce no verdict. Prepare archives it instead of
 * asking a person, so this reader never throws for those four cases.
 *
 * @param statePath Absolute branch-level state file, which may be absent.
 * @returns The reason code, or null when the state is absent or resumable.
 * @throws Anything `readReviewState` raises other than an invalid record.
 */
export function readUnusableReviewStateReason(
  statePath: string,
): UnusableReviewStateReason | null {
  let restored;
  try {
    restored = readReviewState(statePath);
  } catch (error) {
    if (
      error instanceof ToolDiagnosticError &&
      error.code === REVIEW_STATE_DIAGNOSTIC_CODES.STATE_INVALID
    )
      return REVIEW_STATE_DIAGNOSTIC_CODES.STATE_INVALID;
    throw error;
  }
  if (restored === null) return null;
  if ('kind' in restored)
    return REVIEW_STATE_DIAGNOSTIC_CODES.STATE_SCHEMA_MISMATCH;
  if (restored.validationPolicyVersion !== REVIEW_VALIDATION_POLICY_VERSION)
    return REVIEW_STATE_DIAGNOSTIC_CODES.VALIDATION_POLICY_OUTDATED;
  if (
    !restored.incremental ||
    restored.groups.some((group) => !group.fileInputs)
  )
    return REVIEW_STATE_DIAGNOSTIC_CODES.INCREMENTAL_BOOTSTRAP_REQUIRED;
  return null;
}
