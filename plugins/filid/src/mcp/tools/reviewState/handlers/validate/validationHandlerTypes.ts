import type {
  REVIEW_STATE_ACTIONS,
  REVIEW_VALIDATE_KINDS,
} from '../../../../../constants/reviewState.js';
import type {
  ToolDiagnostic,
  ToolStatus,
} from '../../../../../types/toolEnvelope.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type {
  ReviewStateInput,
  ReviewStatePaths,
  ReviewStateRecord,
  ReviewValidationProblem,
} from '../../state/reviewStateTypes.js';

/** Validate input narrowed from the public review-state action union. */
export type ValidateReviewInput = Extract<
  ReviewStateInput,
  Record<'action', typeof REVIEW_STATE_ACTIONS.VALIDATE>
>;

/** Prepared identity shared by review and verifier validation branches. */
export interface ValidateOpinionContext {
  /** Validated public tool request. */
  input: ValidateReviewInput;
  /** Canonical contained artifact paths for the branch. */
  paths: ReviewStatePaths;
  /** Current prepared review state. */
  state: ReviewStateRecord;
  /** Prepared group selected by the request. */
  group: ReviewGroup;
}

/** Fields shared by both exact validation response projections. */
interface CreateValidatePayloadBaseInput {
  /** Selected public action. */
  action: typeof REVIEW_STATE_ACTIONS.VALIDATE;
  /** Canonical contained artifact paths for the branch. */
  paths: ReviewStatePaths;
  /** Tool-level status for the requested artifact operation. */
  status: ToolStatus;
  /** Prepared group whose opinion artifact was checked. */
  group: string;
  /** Opinion contract problems, empty after successful validation. */
  problems: readonly ReviewValidationProblem[];
  /** Diagnostics for missing or unreadable opinion artifacts. */
  diagnostics?: readonly ToolDiagnostic[];
}

/** Complete projector input for a reviewer-opinion validation response. */
interface CreateReviewerValidatePayloadInput extends CreateValidatePayloadBaseInput {
  /** Reviewer-opinion response discriminator. */
  kind: typeof REVIEW_VALIDATE_KINDS.REVIEW;
  /** One-based reviewer round that was checked. */
  round: number;
  /** Whether every reviewer-opinion clause passed. */
  ok: boolean;
  /** Number of contract problems found in the round artifact. */
  problemCount: number;
  /** Number of findings in the canonical merged opinion. */
  findings: number;
  /** Number of finding keys introduced by this round. */
  newFindings: number;
  /** Next reviewer round to run, or null when review is complete. */
  nextRound: number | null;
  /** Absolute canonical merged reviewer-opinion path. */
  opinionPath: string;
  /** Absolute verifier handoff brief path. */
  verifyBriefPath: string;
}

/** Complete projector input for a verifier-opinion validation response. */
interface CreateVerifierValidatePayloadInput extends CreateValidatePayloadBaseInput {
  /** Verifier-opinion response discriminator. */
  kind: typeof REVIEW_VALIDATE_KINDS.VERIFY;
  /** Whether every verifier-opinion clause passed. */
  ok: boolean;
  /** Number of contract problems found in the verifier artifact. */
  problemCount: number;
  /** Number of confirmed verifier decisions. */
  confirmed: number;
  /** Number of refuted verifier decisions. */
  refuted: number;
  /** Number of verifier decisions that remain indeterminate. */
  indeterminate: number;
  /** Absolute canonical verifier-opinion path. */
  verifyPath: string;
}

/** Kind-discriminated input accepted by the exact validate projector. */
export type CreateValidatePayloadInput =
  CreateReviewerValidatePayloadInput | CreateVerifierValidatePayloadInput;
