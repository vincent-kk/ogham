/**
 * Compare two path collections as deterministic sets.
 * @param left First path collection.
 * @param right Second path collection.
 * @returns Whether both collections contain the same unique path values.
 */
export function haveSameReviewPaths(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const expected = new Set(right);
  return (
    expected.size === right.length && left.every((path) => expected.has(path))
  );
}
