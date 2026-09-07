import { REVIEW_ENTRY_STAGES } from '../../../../constants/reviewState.js';
import type { ReviewEntryStage } from '../state/reviewStateTypes.js';

/** File and PR facts the resume point is read from. */
export interface EntryStageEvidence {
  /** A recognized revalidation verdict names the observed current HEAD. */
  hasReValidate: boolean;
  /** Corrections were decided and recorded. */
  hasJustifications: boolean;
  /** A review demanded changes. */
  hasFixRequests: boolean;
  /**
   * Whether a pull request exists. The caller supplies this — filid owns no PR
   * operations — and omitting it is read as "no PR".
   */
  hasPullRequest: boolean;
}

/**
 * Decide where a merge-track cycle resumes. The order is the contract: the
 * first matching condition wins, later ones are not evaluated.
 * @param evidence Review-directory and PR facts with report freshness already checked.
 * @returns The stage to enter.
 */
export function resolveEntryStage(
  evidence: EntryStageEvidence,
): ReviewEntryStage {
  if (evidence.hasReValidate) return REVIEW_ENTRY_STAGES.COMPLETE;
  if (evidence.hasJustifications) return REVIEW_ENTRY_STAGES.REVALIDATE;
  if (evidence.hasFixRequests) return REVIEW_ENTRY_STAGES.RESOLVE;
  if (evidence.hasPullRequest) return REVIEW_ENTRY_STAGES.REVIEW;
  return REVIEW_ENTRY_STAGES.PR_CREATE;
}
