/** One assigned unit's composition, independent of its content and display ID. */
export interface ReviewInputAssignment {
  /** Project-relative canonical source path. */
  path: string;
  /** Committed change kind. */
  change: 'A' | 'M' | 'D';
  /** Stable chunk position within the assigned file, or the whole file. */
  chunk: { index: number; total: number } | null;
  /** Owning fractal path, or explicitly unowned. */
  owner: string | null;
}

/** Observed semantic input digests; run paths and timestamps are excluded. */
export interface ReviewInputSnapshot {
  /** Unique assigned path/chunk pairs. */
  assignment: readonly ReviewInputAssignment[];
  /** Base/head contents and modes, full files, hunks and diff bytes. */
  sourceHash: string;
  /** Applicable rule IDs, bodies and repository rule discovery. */
  rulesHash: string;
  /** Candidate and claim projections actually supplied to this group. */
  evidenceHash: string;
  /** Complete observed context, including negative searches; null is unknown. */
  contextHash: string | null;
  /** Actor methods, effective effort, risk and validation policy. */
  policyHash: string;
}

/** Tool-generated group identity and digest of supplied semantic inputs. */
export interface ReviewInputManifest extends ReviewInputSnapshot {
  /** Input encoding version, independent of the state and opinion schemas. */
  schemaVersion: 1;
  /** Digest of canonical assignment composition only. */
  groupKey: string;
  /** Digest of all observed input sections, including explicit unknowns. */
  preparedInputHash: string;
}

/** Group facts collected before making a reuse decision. */
export interface ReviewReuseCandidate {
  /** Display ID within this generation. */
  id: string;
  /** Observed inputs, or null for a legacy group without provenance. */
  input: ReviewInputManifest | null;
  /** Maximum reviewer rounds; zero denotes canonical bookkeeping. */
  rounds: number;
  /** Display IDs of prior-opinion producers in this generation. */
  dependsOn: readonly string[];
  /** Whether the entire reviewer/verifier artifact chain has been verified. */
  trusted: boolean;
  /** Whether all reviewer rounds and the verifier assignment are finished. */
  complete: boolean;
}

/** Machine-readable reasons that prohibit carrying a previous opinion pair. */
export type ReviewReuseReason =
  | 'source-input-changed'
  | 'rules-changed'
  | 'evidence-changed'
  | 'context-changed'
  | 'dependency-invalidated'
  | 'composition-changed'
  | 'input-unverifiable'
  | 'artifact-untrusted'
  | 'policy-incompatible'
  | 'forced';

/** One current group's provenance match and final reuse decision. */
export interface ReviewGroupReuseDecision {
  /** Current display ID. */
  group: string;
  /** Unique matching origin display ID, or null if unmatched or ambiguous. */
  previousGroup: string | null;
  /** Whether this group consumes previous actor work. */
  disposition: 'reused' | 'rerun' | 'new' | 'bookkeeping';
  /** Stable invalidation reasons, empty only for reuse or new bookkeeping. */
  reasons: ReviewReuseReason[];
}

/** Counts describe actor work, not token prices or observed provider calls. */
export interface ReviewReuseSummary {
  /** Current reviewable groups whose complete opinions are carried. */
  reusedGroups: number;
  /** Current reviewable groups that matched an origin but need fresh work. */
  rerunGroups: number;
  /** Current reviewable groups with no matching origin. */
  newGroups: number;
  /** Previous reviewable groups whose composition is absent now. */
  removedGroups: number;
  /** Current groups owned entirely by deterministic canonical evidence. */
  bookkeepingGroups: number;
  /** Sum of allowed rounds for current non-reused reviewable groups. */
  remainingMaxReviewerHandoffs: number;
}

/** Host-authoritative instructions and the enforced actor execution boundary. */
export interface ReviewActorContext {
  /** Isolated requires native tool restrictions; repository is conservative fallback. */
  mode: 'isolated' | 'repository';
  /** Ordered USR catalog; empty explicitly means no host instructions. */
  userInstructions: string;
}

/** Tool-observed query, including absence and zero-result searches. */
export interface ReviewContextReceipt {
  /** Query whose complete input scope is fingerprinted. */
  operation: 'read' | 'search' | 'exists';
  /** Project-relative file or subtree; dot denotes the entire tree. */
  path: string;
  /** Committed revision selected by the actor. */
  revision: 'head' | 'base';
  /** Literal search text; absent for other queries. */
  query?: string;
  /** Digest of the full scope, independent of pagination. */
  digest: string;
}

/** Recipe for reobserving inputs and publishing reuse decisions. */
export interface ReviewIncrementalState {
  /** Input-observation and carry contract version. */
  version: 1;
  /** Host instruction and actor access contract. */
  actorContext: ReviewActorContext;
  /** Supplied PR text, or null for generated Git context. */
  changeContext: string | null;
  /** Resolved rule/method root observed by this server. */
  pluginRoot: string | null;
  /** Digest of local rules, configuration and observer artifact. */
  environmentHash: string;
  /** Complete roster decisions for this generation. */
  decisions: ReviewGroupReuseDecision[];
  /** Current generation's work estimate. */
  summary: ReviewReuseSummary;
}

/** Immutable origin proof for unchanged copied opinion bytes. */
export interface ReviewOpinionOrigin {
  /** Digest of this generation's origin-state.json snapshot. */
  stateHash: string;
  /** Source identity in the original opinion bytes. */
  sourceHash: string;
  /** Equal semantic input identity at the carry seam. */
  inputHash: string;
}
