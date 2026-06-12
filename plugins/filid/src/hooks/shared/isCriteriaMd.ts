/**
 * Check whether `filePath` targets the acceptance-criteria ledger
 * (`.filid/criteria.md`). Pure string judgment — both `/` and `\`
 * separators, exact case-sensitive match on the `.filid/criteria.md` tail.
 */
export function isCriteriaMd(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    normalized === '.filid/criteria.md' ||
    normalized.endsWith('/.filid/criteria.md')
  );
}
