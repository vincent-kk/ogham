import { isRunId } from './isRunId.js';

/**
 * Select run IDs and order them by date, then by their numeric sequence.
 * @param entries Directory entry names; unrelated names are ignored.
 * @returns A new ascending array, leaving the caller's entries untouched.
 */
export function sortRunIds(entries: readonly string[]): string[] {
  return entries.filter(isRunId).sort(compareRunIds);
}

/**
 * Compare validated IDs without rounding sequences to floating-point numbers.
 * @param left First ID with an eight-digit date and numeric sequence.
 * @param right Second ID with the same syntax.
 * @returns The comparison sign for date first and numeric sequence second.
 */
function compareRunIds(left: string, right: string): number {
  const dateOrder = left.slice(0, 8).localeCompare(right.slice(0, 8));
  if (dateOrder !== 0) return dateOrder;
  const sequenceOrder = BigInt(left.slice(9)) - BigInt(right.slice(9));
  return sequenceOrder < 0n ? -1 : sequenceOrder > 0n ? 1 : 0;
}
