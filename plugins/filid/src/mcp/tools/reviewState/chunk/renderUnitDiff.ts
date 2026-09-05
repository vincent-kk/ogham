import type {
  ParsedReviewDiff,
  ParsedReviewHunk,
} from './types/parsedReviewDiffTypes.js';

/**
 * Render a file header and exactly the ordered hunks assigned to one unit.
 *
 * @param diff Parsed file diff that owns the unchanged header lines.
 * @param hunks Ordered hunk subset assigned to the review unit.
 * @returns Complete newline-terminated unit diff, or empty text when absent.
 */
export function renderUnitDiff(
  diff: ParsedReviewDiff,
  hunks: readonly ParsedReviewHunk[],
): string {
  const lines = [
    ...diff.headerLines,
    ...hunks.flatMap((hunk) => [hunk.header, ...hunk.lines]),
  ];
  return lines.length === 0 ? '' : `${lines.join('\n')}\n`;
}
