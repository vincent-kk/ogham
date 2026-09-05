import type {
  REVIEW_EFFORT_ROUNDS,
  REVIEW_ENTRY_STAGES,
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  REVIEW_STATE_SCHEMA_VERSION,
  REVIEW_VALIDATE_KINDS,
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

import type { ReviewGroup } from './reviewGroupTypes.js';

/** Extracts the union of values exposed by a constant record. */
type ValueOf<T> = T[keyof T];

/** Supported review_state action values. */
export type ReviewStateAction = ValueOf<typeof REVIEW_STATE_ACTIONS>;

/** Persisted review lifecycle phase values. */
export type ReviewStatePhase = ValueOf<typeof REVIEW_STATE_PHASES>;

/** Public review lifecycle disposition values. */
export type ReviewStateDisposition = ValueOf<typeof REVIEW_STATE_DISPOSITIONS>;

/** Merge-track stages that assess can identify. */
export type ReviewEntryStage = ValueOf<typeof REVIEW_ENTRY_STAGES>;

/** Working-tree classifications returned by assess and prepare. */
export type WorktreeDisposition = ValueOf<typeof WORKTREE_DISPOSITIONS>;

/** Reviewer effort level and its configured round count. */
export type ReviewEffort = keyof typeof REVIEW_EFFORT_ROUNDS;

/** Stable problem codes emitted while validating opinion artifacts. */
export type ReviewValidationProblemCode =
  | 'parse-error'
  | 'schema-mismatch'
  | 'source-hash-mismatch'
  | 'file-missing'
  | 'file-unassigned'
  | 'result-invalid'
  | 'finding-id-invalid'
  | 'enum-invalid'
  | 'field-empty'
  | 'path-unassigned'
  | 'gap-required'
  | 'decision-missing'
  | 'decision-unknown';

/** One bounded contract problem found in an opinion artifact. */
export interface ReviewValidationProblem {
  /** Stable machine-readable problem classification. */
  code: ReviewValidationProblemCode;
  /** Related project or artifact path, when one is known. */
  path?: string;
  /** Related reviewer or FCA finding identifier, when one is known. */
  findingId?: string;
  /** Bounded evidence explaining the failed contract clause. */
  detail?: string;
}

/** Committed change classes exposed by prepare. */
export type ReviewScopeChange = 'A' | 'M' | 'D';

/** Review rule-selection role assigned to one changed path. */
export type ReviewScopeRole =
  'source' | 'verification' | 'document' | 'generated' | 'binary' | 'lockfile';

/** Finding category written to evidence and downstream review artifacts. */
export type ReviewScopeCategory = 'contract' | 'structure' | 'verification';

/** FCA evidence origin before review judgment. */
export type ReviewScopeSource = 'structure' | 'verification';

/** Git-derived changed path before snapshot classification. */
export interface ReviewChangedFile {
  /** Project-relative path reported by Git. */
  path: string;
  /** Normalized Git change class. */
  change: ReviewScopeChange;
  /** Inserted text-line count, or zero for binary content. */
  insertions: number;
  /** Deleted text-line count, or zero for binary content. */
  deletions: number;
  /** Whether Git numstat represented either count with `-`. */
  binary: boolean;
}

/** Changed path enriched with its review role and owning fractal. */
export interface ReviewScopeFile extends ReviewChangedFile {
  /** Deterministic selection role. */
  role: ReviewScopeRole;
  /** Project-relative owning fractal path, or null when unowned. */
  owner: string | null;
  /** Exact skip reason for non-reviewable paths, otherwise null. */
  skipReason: string | null;
  /** Ordered built-in and repository-override rule identifiers. */
  rules: string[];
  /** Ordered repository instruction paths the reviewer must read. */
  repositoryRules: string[];
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
      branchName?: string;
      baseRef?: string;
      /** Optional untrusted change summary overriding generated Git context. */
      changeContext?: string;
      force?: boolean;
      /** Optional reviewer effort overriding repository configuration. */
      effort?: ReviewEffort;
    }
  | {
      action:
        | typeof REVIEW_STATE_ACTIONS.CHECKPOINT
        | typeof REVIEW_STATE_ACTIONS.SEAL;
      projectRoot: string;
      branchName?: string;
      baseRef?: string;
    }
  | {
      /** Validation operation selected on the single review-state tool. */
      action: typeof REVIEW_STATE_ACTIONS.VALIDATE;
      projectRoot: string;
      branchName?: string;
      /** Opinion kind whose contract must be checked. */
      kind: ValueOf<typeof REVIEW_VALIDATE_KINDS>;
      /** At-least-two-digit prepared group identifier. */
      group: string;
      /** Required one-based reviewer round and forbidden for verification. */
      round?: number;
    }
  | {
      action: typeof REVIEW_STATE_ACTIONS.CLEANUP;
      projectRoot: string;
      branchName?: string;
      confirm: true;
    }
  | {
      action: typeof REVIEW_STATE_ACTIONS.ASSESS;
      projectRoot: string;
      branchName?: string;
      baseRef?: string;
    };

/** Action inputs after the dispatcher resolves the Git root and source branch. */
export type ResolvedReviewStateInput = ReviewStateInput & {
  branchName: string;
};

/** One runnable actor assignment, containing only canonical absolute paths. */
export interface ReviewHandoff {
  /** Actor whose opinion is required next. */
  kind: 'review' | 'verify';
  /** Prepared group receiving the assignment. */
  group: string;
  /** One-based reviewer round; absent for verifier work. */
  round?: number;
  /** Absolute actor brief path. */
  briefPath: string;
  /** Absolute opinion output path. */
  outputPath: string;
  /** Merged opinion for review round 2 or later, otherwise null. */
  priorOpinionPath: string | null;
}

/** Pure orchestration result derived after artifact effects finish. */
export interface ReviewHandoffPlan {
  /** Currently runnable actor assignments in group order. */
  next: ReviewHandoff[];
  /** Whether all groups have trusted completed artifacts or worktree blocks review. */
  sealReady: boolean;
}

/** Persisted identity and lifecycle state for one branch review. */
export interface ReviewStateRecord {
  /** Persisted record schema version. */
  schemaVersion: typeof REVIEW_STATE_SCHEMA_VERSION;
  /** Absolute project root owning the review. */
  projectRoot: string;
  /** Original branch name supplied by the caller. */
  branchName: string;
  /** Filesystem-safe branch slug with collision hash. */
  normalizedBranch: string;
  /** Base reference supplied at prepare time. */
  baseRef: string;
  /** Resolved merge-base commit. */
  baseCommit: string;
  /** Canonical committed-source identity. */
  sourceHash: string;
  /** Project-relative changed-path hashes used for stale detection. */
  fileHashes: Record<string, string>;
  /** Current prepared or sealed lifecycle phase. */
  phase: ReviewStatePhase;
  /** ISO timestamp from the fresh prepare operation. */
  preparedAt: string;
  /** ISO timestamp added when seal completes. */
  sealedAt?: string;
  /** Reviewer effort controlling the group round count. */
  effort: ReviewEffort;
  /** Deterministic groups and their validation handoffs. */
  groups: ReviewGroup[];
  /** Complete prepare-time evidence and roster snapshot. */
  scope: {
    /** FCA snapshot identity used to render evidence. */
    snapshotHash: string;
    /** Whether both structure and verification evidence are conclusive. */
    evidenceComplete: boolean;
    /** Prepare-time dirty-worktree classification. */
    worktree: WorktreeDisposition;
    /** Bounded project-relative dirty-path list. */
    dirtyPaths: string[];
    /** Per-axis FCA evidence statuses. */
    statuses: Pick<ReviewEvidenceStatuses, 'structure' | 'verification'>;
    /** Complete changed-file roster, including skipped paths. */
    files: ReviewScopeFile[];
    /** Changed-scope FCA claims requiring verifier decisions. */
    candidates: ReviewScopeCandidate[];
    /** Verdict-neutral FCA observations retained as evidence. */
    informational: ReviewScopeInformational[];
    /** Number of FCA findings outside the changed scope. */
    outOfScopeCount: number;
    /** Number of retained informational FCA rows. */
    infoCount: number;
  };
  /** Final deterministic fold, null until seal completes. */
  verdict: 'APPROVED' | 'REQUEST_CHANGES' | 'INCONCLUSIVE' | null;
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
  /** Prepare snapshot identity used for FCA evidence. */
  snapshotHash?: string;
  /** Number of committed changed paths in the prepared roster. */
  filesTotal?: number;
  /** Number of independently reviewable units after chunking. */
  unitsTotal?: number;
  /** Number of deterministic reviewer groups. */
  groupsTotal?: number;
  /** Number of non-informational FCA candidates. */
  candidateCount?: number;
  /** Whether structure and verification evidence are conclusive. */
  evidenceComplete?: boolean;
  /** Observed working-tree disposition. */
  worktree?: WorktreeDisposition;
  /** Reviewer effort used to derive the configured round count. */
  effort?: ReviewEffort;
  /** Maximum reviewer sessions the caller may run concurrently. */
  concurrency?: number;
  /** Opinion kind checked by a validate operation. */
  kind?: ValueOf<typeof REVIEW_VALIDATE_KINDS>;
  /** Prepared group checked by a validate operation. */
  group?: string;
  /** Reviewer round checked by a review validation. */
  round?: number;
  /** Whether the opinion satisfies every validation clause. */
  ok?: boolean;
  /** Number of contract problems found in the opinion. */
  problemCount?: number;
  /** Number of findings in the current canonical merged opinion. */
  findings?: number;
  /** Number of finding keys introduced by the validated review round. */
  newFindings?: number;
  /** Next reviewer round to run, or null when review is complete. */
  nextRound?: number | null;
  /** Number of verifier decisions confirming a candidate. */
  confirmed?: number;
  /** Number of verifier decisions refuting a candidate. */
  refuted?: number;
  /** Number of verifier decisions that remain indeterminate. */
  indeterminate?: number;
  /** Number of roster paths with complete reviewer coverage. */
  filesReviewed?: number;
  /** Number of roster paths skipped deterministically during prepare. */
  filesSkipped?: number;
  /** Deterministically folded verdict restored by cached prepare or seal. */
  verdict?: ReviewStateRecord['verdict'];
}

/** Exact bounded summary returned by the prepare action. */
export interface ReviewPrepareSummary {
  /** Selected public action. */
  action: typeof REVIEW_STATE_ACTIONS.PREPARE;
  /** Whether artifacts were created, resumed, or restored from cache. */
  disposition:
    | typeof REVIEW_STATE_DISPOSITIONS.FRESH
    | typeof REVIEW_STATE_DISPOSITIONS.RESUMABLE
    | typeof REVIEW_STATE_DISPOSITIONS.CACHED;
  /** Canonical committed-source identity. */
  sourceHash: string;
  /** FCA snapshot identity used to render evidence. */
  snapshotHash: string;
  /** Number of committed changed paths in the complete roster. */
  filesTotal: number;
  /** Number of independently reviewable units after chunking. */
  unitsTotal: number;
  /** Number of deterministic reviewer groups. */
  groupsTotal: number;
  /** Number of non-informational FCA candidates. */
  candidateCount: number;
  /** Whether structure and verification evidence are conclusive. */
  evidenceComplete: boolean;
  /** Prepare-time working-tree classification. */
  worktree: WorktreeDisposition;
  /** Reviewer effort used to derive the round count. */
  effort: ReviewEffort;
  /** Maximum reviewer sessions the caller may run concurrently. */
  concurrency: number;
  /** Cached deterministic verdict, present only for a sealed cache hit. */
  verdict?: Exclude<ReviewStateRecord['verdict'], null>;
}

/** Exact bounded data returned by the prepare action. */
export interface ReviewPrepareData extends ReviewHandoffPlan {
  /** Git toplevel containing the requested project path. */
  projectRoot: string;
  /** Original source branch name, before artifact-key normalization. */
  branchName: string;
  /** Verified base reference selected by prepare. */
  baseRef: string;
  /** Absolute branch-scoped review directory. */
  reviewDirectory: string;
  /** Absolute canonical state path. */
  statePath: string;
  /** Absolute canonical evidence path. */
  evidencePath: string;
  /** Absolute orchestration session path. */
  sessionPath: string;
  /** Complete committed changed-file roster. */
  files: ReviewScopeFile[];
  /** Deterministic review groups. */
  groups: ReviewGroup[];
  /** Changed-scope FCA candidates requiring decisions. */
  candidates: ReviewScopeCandidate[];
  /** Number of violations excluded from changed scope. */
  outOfScopeCount: number;
  /** Number of retained informational observations. */
  infoCount: number;
  /** Bounded project-relative dirty paths. */
  dirtyPaths: string[];
  /** Per-axis FCA evidence statuses. */
  statuses: Pick<ReviewEvidenceStatuses, 'structure' | 'verification'>;
}

/** Exact tool envelope returned by every successful prepare disposition. */
export type ReviewPreparePayload = ToolPayload<
  ReviewPrepareSummary,
  ReviewPrepareData
> & {
  /** Inline prepare data is always present. */
  data: ReviewPrepareData;
};

/** Exact bounded summary returned by reviewer-opinion validation. */
interface ReviewReviewerValidateSummary {
  /** Selected public action. */
  action: typeof REVIEW_STATE_ACTIONS.VALIDATE;
  /** Completed artifact-validation disposition. */
  disposition: typeof REVIEW_STATE_DISPOSITIONS.VALIDATED;
  /** Reviewer-opinion validation discriminator. */
  kind: typeof REVIEW_VALIDATE_KINDS.REVIEW;
  /** Prepared group whose reviewer opinion was checked. */
  group: string;
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
}

/** Exact paths and problems returned by reviewer-opinion validation. */
interface ReviewReviewerValidateData extends ReviewHandoffPlan {
  /** Whether independent verification is required after this completed review. */
  verifierRequired: boolean;
  /** Opinion contract problems, empty after successful validation. */
  problems: ReviewValidationProblem[];
  /** Canonical merged reviewer opinion path for review validation. */
  opinionPath: string;
  /** Verifier handoff brief path for review validation. */
  verifyBriefPath: string;
}

/** Exact bounded summary returned by verifier-opinion validation. */
interface ReviewVerifierValidateSummary {
  /** Selected public action. */
  action: typeof REVIEW_STATE_ACTIONS.VALIDATE;
  /** Completed artifact-validation disposition. */
  disposition: typeof REVIEW_STATE_DISPOSITIONS.VALIDATED;
  /** Verifier-opinion validation discriminator. */
  kind: typeof REVIEW_VALIDATE_KINDS.VERIFY;
  /** Prepared group whose verifier opinion was checked. */
  group: string;
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
}

/** Exact path and problems returned by verifier-opinion validation. */
interface ReviewVerifierValidateData extends ReviewHandoffPlan {
  /** Opinion contract problems, empty after successful validation. */
  problems: ReviewValidationProblem[];
  /** Canonical verifier opinion path for verify validation. */
  verifyPath: string;
}

/** Exact tool envelope returned by reviewer-opinion validation. */
type ReviewReviewerValidatePayload = ToolPayload<
  ReviewReviewerValidateSummary,
  ReviewReviewerValidateData
> & {
  /** Inline reviewer problems and handoff paths are always present. */
  data: ReviewReviewerValidateData;
};

/** Exact tool envelope returned by verifier-opinion validation. */
type ReviewVerifierValidatePayload = ToolPayload<
  ReviewVerifierValidateSummary,
  ReviewVerifierValidateData
> & {
  /** Inline verifier problems and opinion path are always present. */
  data: ReviewVerifierValidateData;
};

/** Kind-discriminated tool envelope returned by artifact validation. */
export type ReviewValidatePayload =
  ReviewReviewerValidatePayload | ReviewVerifierValidatePayload;

/** Exact bounded summary returned after a successful seal. */
export interface ReviewSealResponseSummary {
  /** Selected public action. */
  action: typeof REVIEW_STATE_ACTIONS.SEAL;
  /** Completed lifecycle disposition. */
  disposition: typeof REVIEW_STATE_DISPOSITIONS.SEALED;
  /** Deterministically folded non-null verdict. */
  verdict: Exclude<ReviewStateRecord['verdict'], null>;
  /** Number of committed changed paths in the roster. */
  filesTotal: number;
  /** Number of roster paths with complete reviewer coverage. */
  filesReviewed: number;
  /** Number of deterministically skipped roster paths. */
  filesSkipped: number;
  /** Number of confirmed decisions. */
  confirmed: number;
  /** Number of refuted decisions. */
  refuted: number;
  /** Number of indeterminate decisions. */
  indeterminate: number;
}

/** Exact canonical artifact paths returned after a successful seal. */
export interface ReviewSealData {
  /** Absolute canonical review report path. */
  reportPath: string;
  /** Absolute fix-request path, or null when no fixes were rendered. */
  fixRequestsPath: string | null;
  /** Absolute canonical pull-request comment path. */
  prCommentPath: string;
  /** Absolute orchestration session path. */
  sessionPath: string;
}

/** Exact tool envelope returned by a successful or idempotent seal. */
export type ReviewSealPayload = ToolPayload<
  ReviewSealResponseSummary,
  ReviewSealData
> & {
  /** Inline seal artifact paths are always present. */
  data: ReviewSealData;
};

/** Current presence of every artifact needed to resume a prepared review. */
export interface ReviewCheckpointArtifacts {
  /** Whether every brief currently required by group validation state exists. */
  briefs: boolean;
  /** Whether every assigned review unit has its materialized diff. */
  diffs: boolean;
  /** Creation-ordered opinion-file presence for each prepared group. */
  groups: Array<{
    /** At-least-two-digit prepared group identifier. */
    id: string;
    /** Whether the canonical merged reviewer opinion exists. */
    opinion: boolean;
    /** Whether the canonical verifier opinion exists. */
    verify: boolean;
  }>;
}

/** Action-specific review_state data carried inline or in an artifact. */
export interface ReviewStateData {
  /** Read-only checkpoint assignments observed without recovery. */
  next?: ReviewHandoff[];
  /** Checkpoint readiness observed from the current artifact bytes. */
  sealReady?: boolean;
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
  /** `prepare` only: canonical evidence artifact path. */
  evidencePath?: string;
  /** Prepare session orchestration artifact path. */
  sessionPath?: string;
  /** Prepared committed changed-file roster. */
  files?: ReviewScopeFile[];
  /** Prepared deterministic review groups. */
  groups?: ReviewGroup[];
  /** `checkpoint` only: bounded required and per-group artifact presence. */
  artifacts?: ReviewCheckpointArtifacts;
  /** Prepared verifier candidates. */
  candidates?: ReviewScopeCandidate[];
  /** Number of violations outside changed scope. */
  outOfScopeCount?: number;
  /** Number of retained informational rows. */
  infoCount?: number;
  /** Bounded dirty path list. */
  dirtyPaths?: string[];
  /** Per-axis evidence statuses. */
  statuses?: Pick<ReviewEvidenceStatuses, 'structure' | 'verification'>;
  /** Opinion contract problems found by validate. */
  problems?: ReviewValidationProblem[];
  /** Absolute canonical merged reviewer opinion path. */
  opinionPath?: string;
  /** Absolute verifier handoff brief path. */
  verifyBriefPath?: string;
  /** Absolute verifier opinion path. */
  verifyPath?: string;
  /** Absolute fix-request artifact path, or null when none is rendered. */
  fixRequestsPath?: string | null;
  /** Absolute canonical pull-request comment artifact path. */
  prCommentPath?: string;
}

/** Common tool envelope returned by review_state handlers. */
export type ReviewStatePayload = ToolPayload<
  ReviewStateSummary,
  ReviewStateData
> & {
  data: ReviewStateData;
};

/** Every action-specific payload the review_state dispatcher may return. */
export type ReviewStateResult =
  | ReviewPreparePayload
  | ReviewValidatePayload
  | ReviewSealPayload
  | ReviewStatePayload;

/** Action-correlated response returned for a validated review_state input. */
export type ReviewStateResultFor<Input extends ReviewStateInput> =
  Input extends { action: typeof REVIEW_STATE_ACTIONS.PREPARE }
    ? ReviewPreparePayload
    : Input extends { action: typeof REVIEW_STATE_ACTIONS.VALIDATE }
      ? ReviewValidatePayload | ReviewStatePayload
      : Input extends { action: typeof REVIEW_STATE_ACTIONS.SEAL }
        ? ReviewSealPayload | ReviewStatePayload
        : ReviewStatePayload;

/** Contained canonical paths for one branch review directory. */
export interface ReviewStatePaths {
  projectRoot: string;
  normalizedBranch: string;
  reviewRoot: string;
  reviewDirectory: string;
  statePath: string;
  reportPath: string;
  evidencePath: string;
  /** Canonical orchestration session artifact path. */
  sessionPath: string;
  /** Canonical pull-request comment artifact path. */
  prCommentPath: string;
  /** Canonical fix-request artifact path. */
  fixRequestsPath: string;
  /** Canonical directory containing reviewer and verifier opinions. */
  opinionsDirectory: string;
  /** Canonical directory containing materialized unit diffs. */
  diffsDirectory: string;
  /** Canonical directory containing reviewer and verifier briefs. */
  briefsDirectory: string;
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
  /** Optional checkpoint plan computed after reading artifact trust. */
  handoff?: ReviewHandoffPlan;
  action: ReviewStateAction;
  disposition: ReviewStateDisposition;
  paths: ReviewStatePaths;
  status: ToolStatus;
  diagnostics?: readonly ToolDiagnostic[];
  state?: ReviewStateRecord;
  /** Effective concurrency returned to prepare callers. */
  concurrency?: number;
  /** Checkpoint-only bounded artifact-presence projection. */
  artifacts?: ReviewCheckpointArtifacts;
}
