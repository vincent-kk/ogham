import type { ParsedReviewHunk } from './types/parsedReviewDiffTypes.js';

/**
 * Split an oversized hunk in source order without duplicating context lines.
 *
 * @param hunk Parsed hunk whose body and old/new cursors must be preserved.
 * @param churnLimit Positive maximum changed-line count for each piece.
 * @returns Ordered hunk pieces with recalculated headers and source ranges.
 * @throws When the supplied churn limit is not a positive integer.
 */
export function splitOversizedHunk(
  hunk: ParsedReviewHunk,
  churnLimit: number,
): ParsedReviewHunk[] {
  if (!Number.isInteger(churnLimit) || churnLimit <= 0)
    throw new Error('group churn limit must be a positive integer');
  if (hunk.churn <= churnLimit) return [{ ...hunk, lines: [...hunk.lines] }];

  const segments: string[][] = [[]];
  let segmentChurn = 0;
  for (const line of hunk.lines) {
    if (line === '\\ No newline at end of file') {
      segments.at(-1)?.push(line);
      continue;
    }
    if (segmentChurn === churnLimit) {
      segments.push([]);
      segmentChurn = 0;
    }
    segments.at(-1)?.push(line);
    if (line[0] === '-' || line[0] === '+') segmentChurn += 1;
  }

  const pieces: ParsedReviewHunk[] = [];
  let oldCursor = hunk.oldStart + (hunk.oldCount === 0 ? 1 : 0);
  let newCursor = hunk.newStart + (hunk.newCount === 0 ? 1 : 0);
  for (const lines of segments) {
    const oldStart = oldCursor;
    const newStart = newCursor;
    const oldCount = lines
      .filter((line) => line[0] !== '+')
      .filter((line) => line[0] !== '\\').length;
    const newCount = lines
      .filter((line) => line[0] !== '-')
      .filter((line) => line[0] !== '\\').length;
    const churn = lines.filter(
      (line) => line[0] === '-' || line[0] === '+',
    ).length;
    const oldHeaderStart = oldCount === 0 ? oldStart - 1 : oldStart;
    const newHeaderStart = newCount === 0 ? newStart - 1 : newStart;
    const header = `@@ -${oldHeaderStart},${oldCount} +${newHeaderStart},${newCount} @@${hunk.headerSuffix}`;
    pieces.push({
      header,
      headerSuffix: hunk.headerSuffix,
      oldStart,
      oldCount,
      oldEnd: oldStart + oldCount - 1,
      newStart,
      newCount,
      newEnd: newStart + newCount - 1,
      lines: [...lines],
      churn,
    });
    oldCursor += oldCount;
    newCursor += newCount;
  }

  return pieces;
}
