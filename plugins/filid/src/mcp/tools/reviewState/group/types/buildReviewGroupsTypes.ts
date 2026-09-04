import type { ReviewGroup, ReviewUnit } from '../../state/reviewGroupTypes.js';
import type {
  ReviewScopeCandidate,
  ReviewScopeFile,
} from '../../state/reviewStateTypes.js';

/** Explicit inputs for deterministic review-group construction. */
export interface BuildReviewGroupsOptions {
  /** Ordered review units awaiting bounded grouping. */
  units: readonly ReviewUnit[];
  /** Complete scoped file roster used for owner and churn lookup. */
  files: readonly ReviewScopeFile[];
  /** FCA candidates awaiting exactly-one group assignment. */
  candidates: readonly ReviewScopeCandidate[];
  /** Review rounds assigned to every nonempty review group. */
  rounds: number;
  /** Maximum number of review units in a normal group. */
  groupFileLimit: number;
  /** Maximum combined changed-line churn in a group. */
  groupChurnLimit: number;
  /** Whole-file churn threshold that requires a reviewer plan. */
  planChurnLimit: number;
}

/** Inputs for assigning FCA candidates to already-created groups. */
export interface AssignCandidatesToGroupsOptions {
  /** Groups in numeric creation order. */
  groups: readonly ReviewGroup[];
  /** Scoped files used to resolve each unit's owner. */
  files: readonly ReviewScopeFile[];
  /** FCA candidates to assign once in their existing order. */
  candidates: readonly ReviewScopeCandidate[];
}
