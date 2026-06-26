import type { DateField } from "../../../types/enums.js";

/** Date filter applied to a count probe. */
export interface CountRange {
  dateField: DateField;
  from: string;
  to: string;
}

/**
 * Count probe seam. The tool injects an ESearch-backed implementation; the
 * segmenter stays pure and testable. When `range` is given the implementation
 * must apply the date filter so the count reflects that bucket.
 */
export type CountFn = (term: string, range?: CountRange) => Promise<number>;

/** Probe the ESearch Count for a term (optionally within a date bucket). */
export async function probeCount(
  countFn: CountFn,
  term: string,
  range?: CountRange,
): Promise<number> {
  return countFn(term, range);
}
