import type { ReviewChangedFile } from '../../state/reviewStateTypes.js';

/** Numeric and binary facts parsed from one numstat record. */
type ChangedFileChurn = Pick<
  ReviewChangedFile,
  'insertions' | 'deletions' | 'binary'
>;

/**
 * Parse one numeric numstat token while treating Git's binary marker as zero.
 * @param value Insertion or deletion token emitted by Git.
 * @returns Parsed line count, or zero for binary content.
 */
function parseChurnValue(value: string): number {
  if (value === '-') return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed))
    throw new Error('git diff --numstat returned invalid churn');
  return parsed;
}

/**
 * Parse NUL-delimited `git diff --numstat` output without splitting path tabs.
 * @param output Raw Git output containing insertion, deletion and path records.
 * @returns Map from path to numeric churn and binary identity.
 */
export function parseChangedFileChurn(
  output: string,
): Map<string, ChangedFileChurn> {
  const churn = new Map<string, ChangedFileChurn>();
  for (const record of output.split('\0').filter(Boolean)) {
    const firstTab = record.indexOf('\t');
    const secondTab = record.indexOf('\t', firstTab + 1);
    if (firstTab < 0 || secondTab < 0)
      throw new Error('git diff --numstat returned an incomplete record');
    const insertionToken = record.slice(0, firstTab);
    const deletionToken = record.slice(firstTab + 1, secondTab);
    churn.set(record.slice(secondTab + 1), {
      insertions: parseChurnValue(insertionToken),
      deletions: parseChurnValue(deletionToken),
      binary: insertionToken === '-' || deletionToken === '-',
    });
  }
  return churn;
}
