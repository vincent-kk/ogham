import type {
  ParsedReviewDiff,
  ParsedReviewHunk,
} from './types/parsedReviewDiffTypes.js';

/** Unified-diff hunk header with optional explicit old and new counts. */
const HUNK_HEADER_PATTERN = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

/**
 * Parse one path-scoped unified diff without discarding any hunk body line.
 *
 * @param diffText Complete unified diff for one committed changed path.
 * @returns File header lines and ordered hunks with old/new ranges and churn.
 * @throws When a body line or hunk count violates unified-diff structure.
 */
export function parseDiffHunks(diffText: string): ParsedReviewDiff {
  const lines = diffText.replaceAll('\r\n', '\n').split('\n');
  while (lines.at(-1) === '') lines.pop();

  const headerLines: string[] = [];
  const hunks: ParsedReviewHunk[] = [];
  let current: ParsedReviewHunk | null = null;

  for (const line of lines) {
    const match = HUNK_HEADER_PATTERN.exec(line);
    if (match) {
      if (current) hunks.push(current);
      const oldStart = Number(match[1]);
      const oldCount = match[2] === undefined ? 1 : Number(match[2]);
      const newStart = Number(match[3]);
      const newCount = match[4] === undefined ? 1 : Number(match[4]);
      current = {
        header: line,
        headerSuffix: match[5] ?? '',
        oldStart,
        oldCount,
        oldEnd: oldStart + oldCount - 1,
        newStart,
        newCount,
        newEnd: newStart + newCount - 1,
        lines: [],
        churn: 0,
      };
      continue;
    }

    if (!current) {
      headerLines.push(line);
      continue;
    }

    const prefix = line[0];
    const isMarker = line === '\\ No newline at end of file';
    if (prefix !== ' ' && prefix !== '-' && prefix !== '+' && !isMarker)
      throw new Error(`invalid unified diff body line: ${line}`);

    if (isMarker && current.lines.at(-1)?.startsWith('\\'))
      throw new Error('no-newline marker must follow a content line');

    if (isMarker && current.lines.length === 0)
      throw new Error('no-newline marker must follow a content line');

    current.lines.push(line);
    if (prefix === '-' || prefix === '+') current.churn += 1;
  }

  if (current) hunks.push(current);

  for (const hunk of hunks) {
    const oldCount = hunk.lines
      .filter((line) => line[0] !== '+')
      .filter((line) => line[0] !== '\\').length;
    const newCount = hunk.lines
      .filter((line) => line[0] !== '-')
      .filter((line) => line[0] !== '\\').length;
    if (oldCount !== hunk.oldCount || newCount !== hunk.newCount)
      throw new Error(
        `unified diff hunk count mismatch: expected ${hunk.oldCount}/${hunk.newCount}, observed ${oldCount}/${newCount}`,
      );
  }

  return { headerLines, hunks };
}
