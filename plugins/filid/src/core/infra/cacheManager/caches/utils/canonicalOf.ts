/** Canonical visit set: sorted unique boundary-stripped dirs (marker-free). */
export function canonicalOf(reads: string[]): string {
  const dirs = reads.map((key) => {
    const tab = key.indexOf('\t');
    return tab === -1 ? key : key.slice(tab + 1);
  });
  return [...new Set(dirs)].sort().join('\n');
}
