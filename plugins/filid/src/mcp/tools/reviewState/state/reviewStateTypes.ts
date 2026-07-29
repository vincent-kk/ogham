import type {
  REVIEW_ENTRY_STAGES,
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  REVIEW_STATE_SCHEMA_VERSION,
  WORKTREE_DISPOSITIONS,
} from '../../../../constants/reviewState.js';
import type {
  ToolDiagnostic,
  ToolPayload,
  ToolStatus,
} from '../../../../types/toolEnvelope.js';

type ValueOf<T> = T[keyof T];

export type ReviewStateAction = ValueOf<typeof REVIEW_STATE_ACTIONS>;
export type ReviewStatePhase = ValueOf<typeof REVIEW_STATE_PHASES>;
export type ReviewStateDisposition = ValueOf<typeof REVIEW_STATE_DISPOSITIONS>;
export type ReviewEntryStage = ValueOf<typeof REVIEW_ENTRY_STAGES>;
export type WorktreeDisposition = ValueOf<typeof WORKTREE_DISPOSITIONS>;

/** Dirty paths grouped by class, with the disposition they add up to. */
export interface WorktreeAssessment {
  documents: string[];
  generated: string[];
  source: string[];
  disposition: WorktreeDisposition;
}

/**
 * What merge-track can observe about a branch without judging it. Every field
 * is a fact; deciding what to stop on belongs to the skill that asked.
 */
export interface ReviewAssessment {
  worktree: WorktreeAssessment;
  entryStage: ReviewEntryStage;
  /** Resolved base ref, or null when no candidate exists. */
  baseRef: string | null;
  /** Commits on HEAD but not upstream; null when the branch has no upstream. */
  unpushedCommits: number | null;
}

export type ReviewStateInput =
  | {
      action: typeof REVIEW_STATE_ACTIONS.PREPARE;
      projectRoot: string;
      branchName: string;
      baseRef: string;
      force?: boolean;
    }
  | {
      action:
        | typeof REVIEW_STATE_ACTIONS.CHECKPOINT
        | typeof REVIEW_STATE_ACTIONS.SEAL;
      projectRoot: string;
      branchName: string;
      baseRef?: string;
    }
  | {
      action: typeof REVIEW_STATE_ACTIONS.CLEANUP;
      projectRoot: string;
      branchName: string;
      confirm: true;
    }
  | {
      action: typeof REVIEW_STATE_ACTIONS.ASSESS;
      projectRoot: string;
      branchName: string;
      baseRef?: string;
    };

export interface ReviewStateRecord {
  schemaVersion: typeof REVIEW_STATE_SCHEMA_VERSION;
  projectRoot: string;
  branchName: string;
  normalizedBranch: string;
  baseRef: string;
  baseCommit: string;
  sourceHash: string;
  fileHashes: Record<string, string>;
  phase: ReviewStatePhase;
  preparedAt: string;
  sealedAt?: string;
}

export interface ReviewStateSummary {
  action: ReviewStateAction;
  /** Lifecycle disposition. Absent for `assess`, which reads no state file. */
  disposition?: ReviewStateDisposition;
  phase?: ReviewStatePhase;
  sourceHash?: string;
  /** Absent for `assess`, which does not enumerate artifacts. */
  artifactCount?: number;
  /** `assess` only: where the cycle resumes. */
  entryStage?: ReviewEntryStage;
  /** `assess` only: what the dirty paths add up to. */
  worktreeDisposition?: WorktreeDisposition;
  /** `assess` only: resolved base ref, null when none exists. */
  baseRef?: string | null;
  /** `assess` only: commits ahead of upstream, null without an upstream. */
  unpushedCommits?: number | null;
  /** `assess` only: how many paths git reported dirty. */
  dirtyPathCount?: number;
}

export interface ReviewStateData {
  /** Absent for `assess`. */
  disposition?: ReviewStateDisposition;
  reviewDirectory: string;
  statePath: string;
  /** Absent for `assess`. */
  artifactPaths?: string[];
  reportPath?: string;
  state?: ReviewStateRecord;
  /** `assess` only: the observed facts, grouped. */
  assessment?: ReviewAssessment;
}

export type ReviewStatePayload = ToolPayload<
  ReviewStateSummary,
  ReviewStateData
> & {
  data: ReviewStateData;
};

export interface ReviewStatePaths {
  projectRoot: string;
  normalizedBranch: string;
  reviewRoot: string;
  reviewDirectory: string;
  statePath: string;
  reportPath: string;
}

export interface ReviewSourceSnapshot {
  baseCommit: string;
  sourceHash: string;
  fileHashes: Record<string, string>;
}

export interface ReviewHeadTreeEntry {
  objectHash: string;
  identity: string;
}

export interface CreateReviewStatePayloadInput {
  action: ReviewStateAction;
  disposition: ReviewStateDisposition;
  paths: ReviewStatePaths;
  status: ToolStatus;
  diagnostics?: readonly ToolDiagnostic[];
  state?: ReviewStateRecord;
}
