import type {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
} from '../../../../../constants/reviewState.js';
import type {
  ToolDiagnostic,
  ToolStatus,
} from '../../../../../types/toolEnvelope.js';
import type {
  ReviewPreparePayload,
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

/** Values needed to project one prepare response without lifecycle-only fields. */
interface CreatePreparedReviewPayloadInput {
  /** Selected prepare action. */
  action: typeof REVIEW_STATE_ACTIONS.PREPARE;
  /** Whether the state was created, resumed, or restored from cache. */
  disposition:
    | typeof REVIEW_STATE_DISPOSITIONS.FRESH
    | typeof REVIEW_STATE_DISPOSITIONS.RESUMABLE
    | typeof REVIEW_STATE_DISPOSITIONS.CACHED;
  /** Canonical branch-scoped artifact paths. */
  paths: ReviewStatePaths;
  /** Tool-level status for the prepare operation. */
  status: ToolStatus;
  /** Complete state whose scope is projected into the response. */
  state: ReviewStateRecord;
  /** Effective configured reviewer concurrency. */
  concurrency: number;
  /** Scope diagnostics retained from fresh evidence collection. */
  diagnostics?: readonly ToolDiagnostic[];
}

/** Shared immutable diagnostics collection for prepare responses. */
const EMPTY_PREPARE_DIAGNOSTICS: readonly never[] = Object.freeze([]);

/**
 * Project canonical prepared state into the exact public prepare response.
 *
 * @param input Prepared state, paths, disposition, status, and concurrency.
 * @returns The bounded prepare summary and complete roster projection.
 */
export function createPreparedReviewPayload(
  input: CreatePreparedReviewPayloadInput,
): ReviewPreparePayload {
  return {
    projectRoot: input.paths.projectRoot,
    status: input.status,
    summary: {
      action: input.action,
      disposition: input.disposition,
      sourceHash: input.state.sourceHash,
      snapshotHash: input.state.scope.snapshotHash,
      filesTotal: input.state.scope.files.length,
      unitsTotal: input.state.groups.reduce(
        (total, group) => total + group.units.length,
        0,
      ),
      groupsTotal: input.state.groups.length,
      candidateCount: input.state.scope.candidates.length,
      evidenceComplete: input.state.scope.evidenceComplete,
      worktree: input.state.scope.worktree,
      effort: input.state.effort,
      concurrency: input.concurrency,
      ...(input.state.verdict === null ? {} : { verdict: input.state.verdict }),
    },
    data: {
      reviewDirectory: input.paths.reviewDirectory,
      statePath: input.paths.statePath,
      evidencePath: input.paths.evidencePath,
      sessionPath: input.paths.sessionPath,
      files: input.state.scope.files,
      groups: input.state.groups,
      candidates: input.state.scope.candidates,
      outOfScopeCount: input.state.scope.outOfScopeCount,
      infoCount: input.state.scope.infoCount,
      dirtyPaths: input.state.scope.dirtyPaths,
      statuses: input.state.scope.statuses,
    },
    diagnostics: [...(input.diagnostics ?? EMPTY_PREPARE_DIAGNOSTICS)],
  };
}
