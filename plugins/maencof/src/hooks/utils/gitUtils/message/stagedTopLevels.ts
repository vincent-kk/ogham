/**
 * @file stagedTopLevels.ts
 * @description Unique top-level directories of the staged paths, ordered by scope
 * position; entries outside the scope sort last, alphabetically.
 */
export function stagedTopLevels(
  stagedFiles: readonly string[],
  scope: readonly string[],
): string[] {
  const order = scope.map((entry) => entry.replace(/\/+$/, ''));
  const rank = (name: string) => {
    const index = order.indexOf(name);
    return index === -1 ? order.length : index;
  };
  const unique = [...new Set(stagedFiles.map((file) => file.split('/')[0]))];
  return unique.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
