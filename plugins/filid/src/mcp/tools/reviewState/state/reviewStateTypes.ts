import type {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  REVIEW_STATE_SCHEMA_VERSION,
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
  disposition: ReviewStateDisposition;
  phase?: ReviewStatePhase;
  sourceHash?: string;
  artifactCount: number;
}

export interface ReviewStateData {
  disposition: ReviewStateDisposition;
  reviewDirectory: string;
  statePath: string;
  artifactPaths: string[];
  reportPath?: string;
  state?: ReviewStateRecord;
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
