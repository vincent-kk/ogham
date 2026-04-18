/**
 * Recursively compress a list of path strings into brace notation.
 */
function compressGroup(paths: string[]): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) return paths[0];

  // Split each path into [head, ...tail] by first '/'
  const split = paths.map((p) => {
    const idx = p.indexOf('/');
    if (idx === -1) return { head: p, tail: '' };
    return { head: p.slice(0, idx), tail: p.slice(idx + 1) };
  });

  // Group by head segment
  const groups = new Map<string, string[]>();
  for (const { head, tail } of split) {
    const existing = groups.get(head) ?? [];
    existing.push(tail);
    groups.set(head, existing);
  }

  const parts: string[] = [];
  for (const [head, tails] of groups) {
    const nonEmpty = tails.filter((t) => t !== '');
    if (nonEmpty.length === 0) {
      parts.push(head);
    } else if (nonEmpty.length === 1) {
      parts.push(`${head}/${nonEmpty[0]}`);
    } else {
      const inner = compressGroup(nonEmpty);
      parts.push(`${head}/{${inner}}`);
    }
  }

  return parts.join(',');
}

/**
 * Compress paths using brace expansion notation.
 * Input: ["src/payment/checkout", "src/payment/refund", "src/auth"]
 * Output: "src/{payment/{checkout,refund},auth}"
 *
 * Simple implementation: find common prefixes and group.
 * For a single path, just return it. For paths with no common prefix, join with comma.
 */
export function compressPaths(paths: string[], currentDir?: string): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) {
    const p = paths[0];
    if (currentDir && p === currentDir) return `${p}/*`;
    return p;
  }

  // Mark currentDir with * suffix
  const marked = paths.map((p) =>
    currentDir && p === currentDir ? `${p}/*` : p,
  );

  return compressGroup(marked);
}
