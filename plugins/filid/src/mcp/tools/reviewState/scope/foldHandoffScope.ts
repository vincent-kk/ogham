/**
 * Fold owner paths to a bounded deterministic set of common ancestors.
 * @param owners Normalized project-relative owner paths, including `.` for root.
 * @param limit Positive maximum number of scope paths accepted by the caller.
 * @returns Sorted unique paths after deepest owners are replaced by parents.
 */
export function foldHandoffScope(
  owners: readonly string[],
  limit: number,
): string[] {
  let folded = [...owners]
    .sort()
    .filter((path, index, paths) => index === 0 || path !== paths[index - 1]);
  while (folded.length > limit) {
    const deepestIndex = folded.reduce((selected, path, index, paths) => {
      const depth = path === '.' ? 0 : path.split('/').length;
      const selectedDepth =
        paths[selected] === '.' ? 0 : paths[selected].split('/').length;
      return depth > selectedDepth ? index : selected;
    }, 0);
    const deepest = folded[deepestIndex];
    const separator = deepest.lastIndexOf('/');
    folded[deepestIndex] = separator < 0 ? '.' : deepest.slice(0, separator);
    folded = folded
      .sort()
      .filter((path, index, paths) => index === 0 || path !== paths[index - 1]);
  }
  return folded;
}
