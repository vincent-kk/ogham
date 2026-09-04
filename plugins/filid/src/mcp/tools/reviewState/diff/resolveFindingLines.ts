import type { ReviewHunk } from '../state/reviewGroupTypes.js';

/** Deterministic source location attached to a validated review finding. */
interface ResolvedFindingLines {
  /** Inclusive one-based source range, or `unknown` when no unique match exists. */
  lines: string;
  /** Whether the resolved range overlaps a changed range assigned to the unit. */
  inDiff: boolean;
}

/** One exact source-text occurrence considered during location resolution. */
interface FindingLineMatch {
  /** One-based inclusive first matched line. */
  start: number;
  /** One-based inclusive last matched line. */
  end: number;
}

/**
 * Locate reviewer-supplied existing code in committed source text.
 *
 * @param sourceText - Complete committed text for the finding path.
 * @param existingCode - Exact reviewer excerpt compared after per-line trimming.
 * @param hunks - Changed ranges assigned to the finding's review unit.
 * @returns A unique inclusive range and whether it overlaps the unit diff.
 */
export function resolveFindingLines(
  sourceText: string,
  existingCode: string,
  hunks: readonly ReviewHunk[],
): ResolvedFindingLines {
  const sourceLines = sourceText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim());
  const expectedLines = existingCode
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim());
  if (expectedLines.every((line) => line.length === 0))
    return { lines: 'unknown', inDiff: false };

  const matches: FindingLineMatch[] = [];
  const lastStart = sourceLines.length - expectedLines.length;
  for (let index = 0; index <= lastStart; index += 1) {
    const matchesExcerpt = expectedLines.every(
      (line, offset) => sourceLines[index + offset] === line,
    );
    if (matchesExcerpt)
      matches.push({
        start: index + 1,
        end: index + expectedLines.length,
      });
  }

  const hunkMatches = matches.filter(({ start, end }) =>
    hunks.some(({ newStart, newEnd }) => start >= newStart && end <= newEnd),
  );
  if (hunkMatches.length > 1) return { lines: 'unknown', inDiff: false };

  const match = hunkMatches[0] ?? (matches.length === 1 ? matches[0] : null);
  if (match === null) return { lines: 'unknown', inDiff: false };

  const inDiff = hunks.some(
    ({ newStart, newEnd }) => match.start <= newEnd && match.end >= newStart,
  );
  return { lines: `${String(match.start)}-${String(match.end)}`, inDiff };
}
