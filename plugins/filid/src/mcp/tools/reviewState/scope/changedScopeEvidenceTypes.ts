import type { NormalizedFileFacts } from '../../../../types/fractal.js';
import type { RuleScope } from '../../../../types/rules.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import type {
  ReviewEvidenceStatuses,
  ReviewScopeCandidate,
  ReviewScopeFile,
  ReviewScopeInformational,
  ReviewScopeViolation,
  ReviewSourceSnapshot,
  WorktreeDisposition,
} from '../state/reviewStateTypes.js';

/** Explicit committed identity, settings, and output metadata for scope collection. */
export interface CollectChangedScopeEvidenceInput {
  /** Absolute repository root used by Git, snapshot, and path operations. */
  projectRoot: string;
  /** Committed merge-base and file identity already calculated by prepare. */
  source: ReviewSourceSnapshot;
  /** Canonical evidence artifact path contained by the review directory. */
  evidencePath: string;
  /** Canonical frozen-facts artifact path contained by the review directory. */
  factsPath: string;
  /** Effective generated-path patterns from validated configuration. */
  generatedPaths: readonly string[];
  /** Effective lockfile basenames from validated configuration or defaults. */
  lockfiles: readonly string[];
  /** Timestamp shared with the prepare state and session artifacts. */
  createdAt: string;
}

/** Complete scope facts consumed by the remaining prepare stages. */
export interface CollectedChangedScopeEvidence {
  /** Normalized non-finding diagnostics persisted with the prepared snapshot. */
  evidenceDiagnostics: ToolDiagnostic[];
  /** Normalized non-finding diagnostics of unknown files outside the review scope; they block nothing. */
  outOfScopeDiagnostics: ToolDiagnostic[];
  /**
   * The one report naming review-scope files the declared facts scope drops.
   *
   * Empty when it drops none. Carried apart from the scope diagnostics because
   * the prepare and seal responses echo it, while the scope list is what the
   * blocker fold and `evidence.md` read.
   */
  outsideFactsScope: ToolDiagnostic[];
  /** Snapshot identity shared by every FCA observation in this collection. */
  snapshotHash: string;
  /** Digest of the frozen facts this generation wrote (spec §9). */
  factsDigest: string;
  /** Whether both structure and verification evidence are conclusive. */
  evidenceComplete: boolean;
  /** Classification of current uncommitted paths. */
  worktree: WorktreeDisposition;
  /** Bounded, sorted dirty-path facts returned and persisted by prepare. */
  dirtyPaths: string[];
  /** Digest of the complete sorted dirty-path set. */
  dirtyPathsHash: string;
  /** Per-axis structure and verification statuses. */
  statuses: Pick<
    ReviewEvidenceStatuses,
    'structure' | 'verification' | 'analysisAxes'
  >;
  /** Full committed roster enriched with review selection facts. */
  files: ReviewScopeFile[];
  /** Non-informational FCA findings requiring verifier decisions. */
  candidates: ReviewScopeCandidate[];
  /** Informational FCA observations retained without candidate IDs. */
  informational: ReviewScopeInformational[];
  /** Number of finding observations excluded from changed scope. */
  outOfScopeCount: number;
  /** Number of retained informational observations. */
  infoCount: number;
  /** Snapshot diagnostics returned to the review_state caller. */
  diagnostics: ToolDiagnostic[];
}

/** Non-writing changed-scope result shared by prepare and handoff writers. */
export interface ComputedChangedScopeEvidence extends Omit<
  CollectedChangedScopeEvidence,
  'statuses' | 'factsDigest'
> {
  /** Full derived statuses, including aggregate evidence completeness. */
  statuses: ReviewEvidenceStatuses;
  /** Normalized facts of the review-scope files, for the caller to freeze. */
  frozenFacts: NormalizedFileFacts[];
  /** All violations excluded from changed scope. */
  outOfScope: ReviewScopeViolation[];
  /** Non-finding diagnostics inside the review scope, normalized for persisted or returned evidence. */
  evidenceDiagnostics: ToolDiagnostic[];
  /** Effective rule scope indexed by rule identifier. */
  ruleScopeById: ReadonlyMap<string, RuleScope>;
}
