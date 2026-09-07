import type { ReviewScopeFile } from '../state/reviewStateTypes.js';

import { parseDiffHunks } from './parseDiffHunks.js';
import { renderUnitDiff } from './renderUnitDiff.js';
import { splitOversizedHunk } from './splitOversizedHunk.js';
import type {
  ChunkedReviewUnit,
  ParsedReviewHunk,
} from './types/parsedReviewDiffTypes.js';

/**
 * Divide one reviewable file diff into bounded, independently rendered units.
 *
 * @param file Classified roster entry whose committed churn must be preserved.
 * @param diffText Complete path-scoped unified diff read from Git.
 * @param groupChurnLimit Positive maximum churn allowed in any returned unit.
 * @returns Ordered units paired with the exact diff bytes assigned to each.
 * @throws When the limit is invalid or the parsed diff cannot preserve churn.
 */
export function chunkUnits(
  file: ReviewScopeFile,
  diffText: string,
  groupChurnLimit: number,
): ChunkedReviewUnit[] {
  if (!Number.isInteger(groupChurnLimit) || groupChurnLimit <= 0)
    throw new Error('group churn limit must be a positive integer');

  const parsed = parseDiffHunks(diffText);
  const expectedChurn = file.insertions + file.deletions;
  const parsedChurn = parsed.hunks.reduce(
    (total, hunk) => total + hunk.churn,
    0,
  );
  if (parsedChurn !== expectedChurn)
    throw new Error(
      `diff churn mismatch for ${file.path}: expected ${expectedChurn}, observed ${parsedChurn}`,
    );

  if (expectedChurn <= groupChurnLimit)
    return [
      {
        unit: {
          path: file.path,
          change: file.change,
          chunk: null,
          churn: expectedChurn,
          hunks: parsed.hunks.map(({ oldStart, oldEnd, newStart, newEnd }) => ({
            oldStart,
            oldEnd,
            newStart,
            newEnd,
          })),
          diffPath: '',
        },
        diffText: renderUnitDiff(parsed, parsed.hunks),
      },
    ];

  const pieces = parsed.hunks.flatMap((hunk) =>
    splitOversizedHunk(hunk, groupChurnLimit),
  );
  const packed: ParsedReviewHunk[][] = [];
  let current: ParsedReviewHunk[] = [];
  let currentChurn = 0;
  for (const piece of pieces) {
    if (piece.churn > groupChurnLimit)
      throw new Error(`review unit exceeds churn limit for ${file.path}`);

    if (current.length > 0 && currentChurn + piece.churn > groupChurnLimit) {
      packed.push(current);
      current = [];
      currentChurn = 0;
    }
    current.push(piece);
    currentChurn += piece.churn;
  }
  if (current.length > 0) packed.push(current);

  const assignedChurn = packed.reduce(
    (total, hunks) =>
      total + hunks.reduce((unitTotal, hunk) => unitTotal + hunk.churn, 0),
    0,
  );
  if (assignedChurn !== expectedChurn || packed.length === 0)
    throw new Error(`review units do not preserve diff churn for ${file.path}`);

  return packed.map((hunks, index) => ({
    unit: {
      path: file.path,
      change: file.change,
      chunk: { index: index + 1, total: packed.length },
      churn: hunks.reduce((total, hunk) => total + hunk.churn, 0),
      hunks: hunks.map(({ oldStart, oldEnd, newStart, newEnd }) => ({
        oldStart,
        oldEnd,
        newStart,
        newEnd,
      })),
      diffPath: '',
    },
    diffText: renderUnitDiff(parsed, hunks),
  }));
}
