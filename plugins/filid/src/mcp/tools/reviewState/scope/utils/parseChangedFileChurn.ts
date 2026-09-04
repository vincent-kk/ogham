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
 * @returns Map from path to numeric insertion and deletion counts.
 */
export function parseChangedFileChurn(
  output: string,
): Map<string, { insertions: number; deletions: number }> {
  const churn = new Map<string, { insertions: number; deletions: number }>();
  for (const record of output.split('\0').filter(Boolean)) {
    const firstTab = record.indexOf('\t');
    const secondTab = record.indexOf('\t', firstTab + 1);
    if (firstTab < 0 || secondTab < 0)
      throw new Error('git diff --numstat returned an incomplete record');
    churn.set(record.slice(secondTab + 1), {
      insertions: parseChurnValue(record.slice(0, firstTab)),
      deletions: parseChurnValue(record.slice(firstTab + 1, secondTab)),
    });
  }
  return churn;
}
