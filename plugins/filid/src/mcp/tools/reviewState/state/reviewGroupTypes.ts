/** Changed-line range owned by one review unit. */
export interface ReviewHunk {
  /** First old-file line consumed by the hunk. */
  oldStart: number;
  /** Last old-file line consumed, preceding `oldStart` for an empty range. */
  oldEnd: number;
  /** First new-file line produced by the hunk. */
  newStart: number;
  /** Last new-file line produced, preceding `newStart` for an empty range. */
  newEnd: number;
}

/** One-based identity for a bounded slice of a larger file diff. */
interface ReviewChunk {
  /** One-based chunk position within its source file. */
  index: number;
  /** Total chunks emitted for the source file. */
  total: number;
}

/** Smallest independently reviewable slice of one committed file change. */
export interface ReviewUnit {
  /** Project-relative changed path. */
  path: string;
  /** Git change class for the path. */
  change: 'A' | 'M' | 'D';
  /** One-based chunk identity, or null for an unchunked path. */
  chunk: ReviewChunk | null;
  /** Inserted-plus-deleted line count assigned to the unit. */
  churn: number;
  /** Exact old/new ranges contained in the unit diff. */
  hunks: ReviewHunk[];
  /** Review-directory-relative materialized diff path. */
  diffPath: string;
}

/** Deterministic reviewer assignment with artifact and validation handoff state. */
export interface ReviewGroup {
  /** At-least-two-digit creation-order identifier. */
  id: string;
  /** Independently reviewable units assigned to this reviewer. */
  units: ReviewUnit[];
  /** Sum of assigned unit churn. */
  churn: number;
  /** Whether a reviewer must write an explicit risk plan. */
  planRequired: boolean;
  /** Earlier chunk groups whose merged opinions must be read first. */
  dependsOn: string[];
  /** FCA candidate identifiers assigned exactly once to this group. */
  candidateIds: string[];
  /** Review-directory-relative reviewer brief path. */
  briefPath: string;
  /** Review-directory-relative first-round skeleton path. */
  skeletonPath: string;
  /** Review-directory-relative merged reviewer opinion path. */
  opinionPath: string;
  /** Review-directory-relative verifier brief path. */
  verifyBriefPath: string;
  /** Review-directory-relative verifier opinion path. */
  verifyPath: string;
  /** Maximum review rounds, or zero for a candidate-only group. */
  rounds: number;
  /** Hash-bound validation handoffs for reviewer and verifier artifacts. */
  validated: {
    /** Last validated merged review artifact, if review is valid. */
    review: {
      /** Highest review round merged into the artifact. */
      round: number;
      /** SHA-256 of the exact merged opinion bytes. */
      sha256: string;
      /** Whether no later review round remains. */
      complete: boolean;
    } | null;
    /** Validated verifier artifact bound to one merged review hash. */
    verify: {
      /** SHA-256 of the exact verifier opinion bytes. */
      sha256: string;
      /** Merged-review hash the verifier was asked to decide. */
      reviewSha256: string;
    } | null;
  };
}
