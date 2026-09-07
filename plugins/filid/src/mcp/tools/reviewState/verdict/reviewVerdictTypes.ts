import type { ToolStatus } from '../../../../types/toolEnvelope.js';
import type {
  ReviewFindingCategory,
  ReviewOpinion,
} from '../opinion/reviewOpinionTypes.js';
import type { ReviewResolutionAdvice } from '../opinion/reviewResolutionAdvice.js';
import type {
  VerifyDecisionVerdict,
  VerifyOpinion,
} from '../opinion/verifyOpinionTypes.js';
import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type {
  ReviewScopeCandidate,
  ReviewScopeChange,
  ReviewScopeFile,
  ReviewScopeInformational,
  ReviewStateRecord,
  WorktreeDisposition,
} from '../state/reviewStateTypes.js';

/** Final governance verdict persisted by seal. */
export type ReviewVerdict = NonNullable<ReviewStateRecord['verdict']>;

/** Stable reason that prevents one group's artifacts from being trusted. */
export type ReviewTrustIssue =
  | 'review rounds incomplete'
  | 'artifact not validated'
  | 'artifact modified after validation'
  | 'verifier decided a superseded opinion';

/** One group paired with only the artifacts that passed the seal trust checks. */
export interface SealGroupEvidence {
  /** Deterministic prepared group metadata. */
  group: ReviewGroup;
  /** Trusted merged reviewer opinion, or null when unavailable. */
  review: ReviewOpinion | null;
  /** Trusted verifier opinion, or null when unavailable. */
  verify: VerifyOpinion | null;
  /** Ordered reasons the group could not be trusted. */
  issues: ReviewTrustIssue[];
}

/** Canonical coverage result for one prepare-time roster row. */
export interface ReviewChecklistEntry {
  /** Project-relative roster path. */
  path: string;
  /** Committed change class copied from the roster. */
  change: ReviewScopeChange;
  /** Creation-ordered groups containing units for the path. */
  groups: string[];
  /** Normalized final coverage state. */
  result: 'reviewed' | 'skipped' | 'pending';
  /** Skip or pending reason, or the empty string for reviewed coverage. */
  reason: string;
}

/** Evidence retained because it was unavailable, inconclusive, or informational. */
export interface ReviewUnresolvedEvidence {
  /** Stable origin of the evidence row. */
  source: string;
  /** Project-relative or artifact-relative path associated with the row. */
  path: string;
  /** Rule or trust contract represented by the row. */
  rule: string;
  /** Concrete unresolved fact without verdict reinterpretation. */
  detail: string;
  /** Whether the row prevents a conclusive verdict. */
  affectsVerdict: boolean;
}

/** Result of projecting trusted reviewer coverage onto the complete roster. */
export interface ReviewChecklistResult {
  /** One checklist entry for every roster row in original order. */
  checklist: ReviewChecklistEntry[];
  /** Coverage gaps that must remain visible in final artifacts. */
  unresolved: ReviewUnresolvedEvidence[];
  /** Number of roster rows. */
  filesTotal: number;
  /** Number of roster rows with complete reviewer coverage. */
  filesReviewed: number;
  /** Number of prepare-time skipped roster rows. */
  filesSkipped: number;
}

/** Reviewer or FCA candidate joined to its independent or canonical disposition. */
export interface JoinedReviewDecision {
  /** Stable reviewer or FCA candidate identifier. */
  id: string;
  /** Whether the candidate originated in reviewer or FCA evidence. */
  origin: 'review' | 'fca';
  /** Candidate impact level. */
  severity: 'error' | 'warning';
  /** Candidate contract category. */
  category: ReviewFindingCategory;
  /** Project-relative candidate path. */
  path: string;
  /** Validated reviewer line range, or `unknown` for FCA candidates. */
  lines: string;
  /** Stable rule supporting the candidate. */
  rule: string;
  /** Original falsifiable candidate claim. */
  message: string;
  /** Trusted independent or deterministic disposition, or synthesized indeterminacy. */
  verdict: VerifyDecisionVerdict;
  /** Independent or canonical evidence, empty when a decision is missing. */
  decisionEvidence: string;
  /** Independent or deterministic reasoning, or `missing decision` when synthesized. */
  decisionReason: string;
  /** Original reviewer evidence, or null for FCA candidates. */
  findingEvidence: string | null;
  /** Reviewer-stated consequence, or null for FCA candidates. */
  consequence: string | null;
  /** Reviewer-stated correction, or null for FCA candidates. */
  recommendedAction: string | null;
}

/** Result of joining every trusted claim to independent and canonical decisions. */
export interface ReviewDecisionJoinResult {
  /** All joined decisions in deterministic group and candidate order. */
  decisions: JoinedReviewDecision[];
  /** Confirmed decisions in their joined order. */
  confirmed: JoinedReviewDecision[];
  /** Refuted decisions in their joined order. */
  refuted: JoinedReviewDecision[];
  /** Explicit or synthesized indeterminate decisions in joined order. */
  indeterminate: JoinedReviewDecision[];
  /** Missing or conflicting decision coverage that must remain visible. */
  unresolved: ReviewUnresolvedEvidence[];
  /** Typed exact-set failures used without interpreting human-readable diagnostics. */
  coverageIssues: ReviewDecisionCoverageIssue[];
}

/** Exact expected and observed identities at a failed decision-set boundary. */
export interface ReviewDecisionCoverageIssue {
  /** Group identity, or null for the global candidate/finding set. */
  groupId: string | null;
  /** Canonical evidence or verifier artifact carrying this set. */
  artifactPath: string;
  /** Required identities, including duplicates that themselves violate the contract. */
  expectedIds: string[];
  /** Observed independent and deterministic decision identities. */
  actualIds: string[];
}

/** Typed source condition responsible for an inconclusive verdict. */
export type ReviewBlockerKind =
  | 'analysis-incomplete'
  | 'dirty-worktree'
  | 'coverage-pending'
  | 'artifact-trust'
  | 'review-gap'
  | 'verifier-indeterminate'
  | 'decision-indeterminate'
  | 'decision-coverage'
  | 'unclassified';

/** Exact scope of a blocker; null explicitly denotes a non-applicable identity. */
export interface ReviewBlockerScope {
  /** Affected repository path, when known. */
  path: string | null;
  /** Owning group, or null when global or shared by multiple groups. */
  groupId: string | null;
  /** Candidate or finding whose disposition is blocked. */
  findingId: string | null;
  /** Rule requiring the missing evidence. */
  rule: string | null;
}

/** Canonical source reference generated from trusted state rather than actor advice. */
export interface ReviewBlockerSource {
  /** Review-directory-relative artifact location. */
  artifactPath: string;
  /** JSON pointer to existing evidence or its containing collection. */
  pointer?: string;
  /** Stable Markdown section or candidate anchor, when applicable. */
  anchor?: string;
}

/** One typed cause before exact deduplication, routing, and stable ID assignment. */
export interface ReviewBlockerCause {
  /** Source condition, never inferred by matching display text. */
  kind: ReviewBlockerKind;
  /** Scope copied from the evidence producing the cause. */
  scope: ReviewBlockerScope;
  /** Unmodified factual gap or deterministic diagnostic. */
  detail: string;
  /** Every canonical source supporting this occurrence. */
  sources: ReviewBlockerSource[];
  /** Optional validated actor or deterministic evidence-recovery proposal. */
  resolution?: ReviewResolutionAdvice;
  /** Provenance of provided advice; absent when advice is unavailable. */
  adviceSource?: 'actor' | 'deterministic';
}

/** A separately identifiable question and resolution route for one sealed review. */
export interface ReviewBlocker extends Omit<
  ReviewBlockerCause,
  'resolution' | 'adviceSource'
> {
  /** Deterministic identifier shared by all outputs of this review. */
  id: string;
  /** Human attention category, not execution authority. */
  attention: 'human-decision' | 'evidence-recovery' | 'triage';
  /** Validated proposal or explicitly labelled missing/conflicting-advice fallback. */
  resolution: ReviewResolutionAdvice;
  /** Whether the proposal came from an actor, typed recovery, or a fallback. */
  adviceSource: 'actor' | 'deterministic' | 'missing' | 'conflict';
  /** All distinct competing proposals when independent sources disagree. */
  alternativeResolutions: ReviewResolutionAdvice[];
}

/** Immutable evidence identity and completeness fields consumed by the fold. */
export interface ReviewVerdictEvidence {
  /** Hash of the committed changed-file blobs. */
  sourceHash: string;
  /** Hash of the structural snapshot used for evidence. */
  snapshotHash: string;
  /** Whether structure and verification evidence were conclusive. */
  evidenceComplete: boolean;
  /** Status returned by the structure evidence source. */
  structureStatus: ToolStatus;
  /** Status returned by the verification evidence source. */
  verificationStatus: ToolStatus;
  /** Observed working-tree classification at prepare time. */
  worktree: WorktreeDisposition;
}

/** Complete pure input needed to derive one final review verdict. */
export interface FoldReviewVerdictInput {
  /** Evidence identity and completeness facts. */
  evidence: ReviewVerdictEvidence;
  /** Complete prepare-time changed-file roster. */
  files: readonly ReviewScopeFile[];
  /** Verdict-affecting FCA candidates. */
  candidates: readonly ReviewScopeCandidate[];
  /** Verdict-neutral FCA observations. */
  informational: readonly ReviewScopeInformational[];
  /** Prepared groups paired with trusted validation handoffs. */
  groups: readonly SealGroupEvidence[];
}

/** Canonical fold result shared by every seal renderer and response. */
export interface ReviewVerdictFold {
  /** Final ordered-table verdict. */
  verdict: ReviewVerdict;
  /** Verdict-blocking questions separated from decisions and neutral observations. */
  blockers: ReviewBlocker[];
  /** Complete normalized roster coverage. */
  checklist: ReviewChecklistEntry[];
  /** Every reviewer and FCA candidate joined to a decision. */
  decisions: JoinedReviewDecision[];
  /** Confirmed decisions in deterministic order. */
  confirmed: JoinedReviewDecision[];
  /** Refuted decisions in deterministic order. */
  refuted: JoinedReviewDecision[];
  /** Explicit or synthesized indeterminate decisions. */
  indeterminate: JoinedReviewDecision[];
  /** Gaps, observations, trust failures, and missing decisions. */
  unresolved: ReviewUnresolvedEvidence[];
  /** Number of roster rows. */
  filesTotal: number;
  /** Number of roster rows fully reviewed. */
  filesReviewed: number;
  /** Number of roster rows skipped during prepare. */
  filesSkipped: number;
}

/** Persisted summary restored from canonical sealed artifacts. */
export interface ReviewSealSummary {
  /** Final verdict persisted by the sealed state. */
  verdict: ReviewVerdict;
  /** Number of roster rows represented by the sealed report. */
  filesTotal: number;
  /** Number of roster rows with complete reviewer coverage. */
  filesReviewed: number;
  /** Number of roster rows skipped during prepare. */
  filesSkipped: number;
  /** Number of independent or canonical decisions confirming a candidate. */
  confirmed: number;
  /** Number of independent or canonical decisions refuting a candidate. */
  refuted: number;
  /** Number of candidate decisions left indeterminate. */
  indeterminate: number;
}
