import type {
  REVIEW_ENTRY_STAGES,
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  REVIEW_STATE_SCHEMA_VERSION,
  WORKTREE_DISPOSITIONS,
} from '../../../../constants/reviewState.js';
import type { VerificationRole } from '../../../../types/adapters.js';
import type {
  AnalysisCertainty,
  FractalTree,
} from '../../../../types/fractal.js';
import type { RuleSeverity } from '../../../../types/rules.js';
import type {
  ToolDiagnostic,
  ToolPayload,
  ToolStatus,
} from '../../../../types/toolEnvelope.js';

type ValueOf<T> = T[keyof T];

/** Supported review_state action values. */
export type ReviewStateAction = ValueOf<typeof REVIEW_STATE_ACTIONS>;

/** Persisted review lifecycle phase values. */
export type ReviewStatePhase = ValueOf<typeof REVIEW_STATE_PHASES>;

/** Public review lifecycle disposition values. */
export type ReviewStateDisposition = ValueOf<typeof REVIEW_STATE_DISPOSITIONS>;

/** Merge-track stages that assess can identify. */
export type ReviewEntryStage = ValueOf<typeof REVIEW_ENTRY_STAGES>;

/** Working-tree classifications returned by assess and scope. */
export type WorktreeDisposition = ValueOf<typeof WORKTREE_DISPOSITIONS>;

/** Committed change classes exposed by scope. */
export type ReviewScopeChange = 'A' | 'M' | 'D';

/** Review rule-selection role assigned to one changed path. */
export type ReviewScopeRole =
  'source' | 'verification' | 'document' | 'generated';

/** Finding category written to evidence and downstream review artifacts. */
export type ReviewScopeCategory = 'contract' | 'structure' | 'verification';

/** FCA evidence origin before review judgment. */
export type ReviewScopeSource = 'structure' | 'verification';

/** Git-derived changed path before snapshot classification. */
export interface ReviewChangedFile {
  path: string;
  change: ReviewScopeChange;
  insertions: number;
  deletions: number;
}

/** Changed path enriched with its review role and owning fractal. */
export interface ReviewScopeFile extends ReviewChangedFile {
  role: ReviewScopeRole;
  owner: string | null;
}

/** Structure or verification violation normalized to a project-relative path. */
export interface ReviewScopeViolation {
  source: ReviewScopeSource;
  severity: RuleSeverity;
  path: string;
  ruleId: string;
  message: string;
  certainty?: AnalysisCertainty;
}

/** Per-rule summary of violations excluded from changed-scope candidates. */
export interface ReviewOutOfScopeSummary {
  source: ReviewScopeSource;
  rule: string;
  severity: RuleSeverity;
  count: number;
}

/** Candidate row that a verifier must independently reproduce. */
export interface ReviewScopeCandidate {
  id: string;
  source: ReviewScopeSource;
  scope: string;
  category: ReviewScopeCategory;
  severity: 'error' | 'warning';
  path: string;
  rule: string;
  message: string;
  certainty?: AnalysisCertainty;
}

/** Informational FCA row retained as supporting evidence without a finding ID. */
export interface ReviewScopeInformational {
  source: ReviewScopeSource;
  scope: string;
  category: ReviewScopeCategory;
  severity: 'info';
  path: string;
  rule: string;
  message: string;
  certainty?: AnalysisCertainty;
}

/** Result of filtering violations against changed paths and owners. */
export interface ChangedScopeViolationSelection {
  retained: ReviewScopeViolation[];
  outOfScope: ReviewScopeViolation[];
}

/** Candidate and informational rows derived from retained violations. */
export interface ScopeCandidateBuildResult {
  candidates: ReviewScopeCandidate[];
  informational: ReviewScopeInformational[];
}

/** Inputs used to enrich one git roster entry without ambient state. */
export interface ClassifyChangedFileOptions {
  generatedPaths: readonly string[];
  tree: FractalTree;
  projectRoot: string;
  classifyVerification: (filePath: string) => VerificationRole | 'unsupported';
}

/** Structure and verification statuses plus whether both are conclusive. */
export interface ReviewEvidenceStatuses {
  structure: ToolStatus;
  verification: ToolStatus;
  evidenceComplete: boolean;
}

/** Complete canonical evidence rendering model. */
export interface ReviewEvidenceModel extends ReviewEvidenceStatuses {
  sourceHash: string;
  snapshotHash: string;
  worktree: WorktreeDisposition;
  createdAt: string;
  files: readonly ReviewScopeFile[];
  candidates: readonly ReviewScopeCandidate[];
  informational: readonly ReviewScopeInformational[];
  outOfScope: readonly ReviewScopeViolation[];
  diagnostics: readonly ToolDiagnostic[];
}

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

/** Discriminated inputs accepted by every review_state action. */
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
      action: typeof REVIEW_STATE_ACTIONS.SCOPE;
      projectRoot: string;
      branchName: string;
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

/** Persisted identity and lifecycle state for one branch review. */
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

/** Bounded inline facts returned for every review_state action. */
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
  /** `scope` only: snapshot identity used for FCA evidence. */
  snapshotHash?: string;
  /** `scope` only: number of committed changed paths. */
  filesTotal?: number;
  /** `scope` only: number of non-informational FCA candidates. */
  candidateCount?: number;
  /** `scope` only: whether structure and verification evidence are conclusive. */
  evidenceComplete?: boolean;
  /** `scope` only: observed working-tree disposition. */
  worktree?: WorktreeDisposition;
}

/** Action-specific review_state data carried inline or in an artifact. */
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
  /** `scope` only: canonical evidence artifact path. */
  evidencePath?: string;
  /** `scope` only: committed changed-file roster. */
  files?: ReviewScopeFile[];
  /** `scope` only: verifier candidates. */
  candidates?: ReviewScopeCandidate[];
  /** `scope` only: number of violations outside changed scope. */
  outOfScopeCount?: number;
  /** `scope` only: number of retained informational rows. */
  infoCount?: number;
  /** `scope` only: bounded dirty path list. */
  dirtyPaths?: string[];
  /** `scope` only: per-axis evidence statuses. */
  statuses?: Pick<ReviewEvidenceStatuses, 'structure' | 'verification'>;
}

/** Common tool envelope returned by review_state handlers. */
export type ReviewStatePayload = ToolPayload<
  ReviewStateSummary,
  ReviewStateData
> & {
  data: ReviewStateData;
};

/** Contained canonical paths for one branch review directory. */
export interface ReviewStatePaths {
  projectRoot: string;
  normalizedBranch: string;
  reviewRoot: string;
  reviewDirectory: string;
  statePath: string;
  reportPath: string;
  evidencePath: string;
}

/** Committed source identity calculated during prepare or checkpoint. */
export interface ReviewSourceSnapshot {
  baseCommit: string;
  sourceHash: string;
  fileHashes: Record<string, string>;
}

/** One git tree entry used to calculate committed source identity. */
export interface ReviewHeadTreeEntry {
  objectHash: string;
  identity: string;
}

/** Inputs for constructing a lifecycle failure or checkpoint payload. */
export interface CreateReviewStatePayloadInput {
  action: ReviewStateAction;
  disposition: ReviewStateDisposition;
  paths: ReviewStatePaths;
  status: ToolStatus;
  diagnostics?: readonly ToolDiagnostic[];
  state?: ReviewStateRecord;
}
