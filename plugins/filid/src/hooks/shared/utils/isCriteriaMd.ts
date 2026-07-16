/**
 * Check whether `filePath` targets the acceptance-criteria ledger
 * (`.filid/criteria.md`). Pure string judgment — both `/` and `\`
 * separators; empty, `.` and `..` segments are resolved so denormalized
 * forms (`.filid//criteria.md`, `.filid/./criteria.md`,
 * `x/../.filid/criteria.md`) cannot slip past the ledger gate.
 * Case-sensitive on the `.filid/criteria.md` tail.
 */
export function isCriteriaMd(filePath: string): boolean {
  const resolved: string[] = [];
  for (const segment of filePath.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  const length = resolved.length;
  return (
    length >= 2 &&
    resolved[length - 2] === '.filid' &&
    resolved[length - 1] === 'criteria.md'
  );
}
