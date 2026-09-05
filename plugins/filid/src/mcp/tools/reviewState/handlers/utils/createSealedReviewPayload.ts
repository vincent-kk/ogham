import type { REVIEW_STATE_ACTIONS } from '../../../../../constants/reviewState.js';
import { REVIEW_STATE_DISPOSITIONS } from '../../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type {
  ReviewSealPayload,
  ReviewStateInput,
  ReviewStatePaths,
} from '../../state/reviewStateTypes.js';
import type { ReviewSealSummary } from '../../verdict/reviewVerdictTypes.js';

/** Shared state-reading input shape accepted by checkpoint and seal. */
type CheckpointOrSealInput = Extract<
  ReviewStateInput,
  Record<
    'action',
    typeof REVIEW_STATE_ACTIONS.CHECKPOINT | typeof REVIEW_STATE_ACTIONS.SEAL
  >
>;
/** Seal-specific narrowing accepted by the successful response projector. */
type SealInput = CheckpointOrSealInput & {
  /** Finalization action selected at the public review-state boundary. */
  action: typeof REVIEW_STATE_ACTIONS.SEAL;
};

/** Shared immutable diagnostics collection for a successful seal response. */
const EMPTY_SEAL_DIAGNOSTICS: readonly never[] = Object.freeze([]);

/** Values needed to project a successful seal response. */
interface CreateSealedReviewPayloadInput {
  /** Validated seal request. */
  input: SealInput;
  /** Canonical branch review paths. */
  paths: ReviewStatePaths;
  /** Persisted or freshly folded verdict counts. */
  summary: ReviewSealSummary;
  /** Whether the verdict produced a fix-request artifact. */
  hasFixRequests: boolean;
}

/**
 * Project a successful seal into the exact bounded response contract.
 *
 * @param input Sealed state, paths, fold, and fix-request presence.
 * @returns Common lifecycle payload enriched with final verdict artifacts.
 */
export function createSealedReviewPayload(
  input: CreateSealedReviewPayloadInput,
): ReviewSealPayload {
  return {
    projectRoot: input.paths.projectRoot,
    status: TOOL_STATUSES.OK,
    summary: {
      action: input.input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.SEALED,
      verdict: input.summary.verdict,
      filesTotal: input.summary.filesTotal,
      filesReviewed: input.summary.filesReviewed,
      filesSkipped: input.summary.filesSkipped,
      confirmed: input.summary.confirmed,
      refuted: input.summary.refuted,
      indeterminate: input.summary.indeterminate,
    },
    data: {
      reportPath: input.paths.reportPath,
      fixRequestsPath: input.hasFixRequests
        ? input.paths.fixRequestsPath
        : null,
      prCommentPath: input.paths.prCommentPath,
      sessionPath: input.paths.sessionPath,
    },
    diagnostics: [...EMPTY_SEAL_DIAGNOSTICS],
  };
}
