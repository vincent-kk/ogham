import type { ReviewUnit } from '../../state/reviewGroupTypes.js';

/** Parsed unified-diff hunk with explicit coordinate and body metadata. */
export interface ParsedReviewHunk {
  /** Original or recomputed unified-diff hunk header. */
  header: string;
  /** Header text following the closing `@@` marker. */
  headerSuffix: string;
  /** First old-file line represented by the hunk. */
  oldStart: number;
  /** Number of old-file lines represented by the hunk. */
  oldCount: number;
  /** Inclusive old-file endpoint, preceding `oldStart` for an empty range. */
  oldEnd: number;
  /** First new-file line represented by the hunk. */
  newStart: number;
  /** Number of new-file lines represented by the hunk. */
  newCount: number;
  /** Inclusive new-file endpoint, preceding `newStart` for an empty range. */
  newEnd: number;
  /** Ordered hunk body lines, including no-newline markers. */
  lines: string[];
  /** Total inserted and deleted lines represented by the hunk. */
  churn: number;
}

/** Parsed path-scoped unified diff used while review units are materialized. */
export interface ParsedReviewDiff {
  /** File-level diff lines that precede the first hunk. */
  headerLines: string[];
  /** Ordered changed hunks found after the file-level header. */
  hunks: ParsedReviewHunk[];
}

/** Persistable review unit paired with its transient rendered diff bytes. */
export interface ChunkedReviewUnit {
  /** State-safe review unit without embedded diff content. */
  unit: ReviewUnit;
  /** Unified diff text to materialize after the group is known. */
  diffText: string;
}
