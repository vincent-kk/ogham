/** Hash-bound artifact trust; absence of validation is distinct from corruption. */
export type ReviewArtifactTrust = 'missing' | 'invalid' | 'trusted';

/** Filesystem facts consumed by the pure group handoff planner. */
export interface ReviewGroupArtifactStatus {
  /** Prepared group whose artifacts were observed. */
  group: string;
  /** Merged bytes against review validation; no validation means missing. */
  review: ReviewArtifactTrust;
  /** Verify bytes and their binding to the validated merged-review hash. */
  verify: ReviewArtifactTrust;
  /** Existing raw reviewer round numbers in ascending order. */
  roundFiles: number[];
  /** Independent finding count, or null when the merged review is untrusted. */
  assignedCount: number | null;
  /** Whether the reviewer brief exists. */
  briefPresent: boolean;
  /** Whether the verifier brief exists. */
  verifyBriefPresent: boolean;
}
