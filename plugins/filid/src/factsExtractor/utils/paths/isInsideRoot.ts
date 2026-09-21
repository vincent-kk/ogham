import { isAbsolute, relative } from 'node:path';

/**
 * Whether a path is the root or lies inside it, judged on the strings.
 * @param root Absolute root.
 * @param path Absolute path.
 * @returns True at or below `root`.
 */
export function isInsideRoot(root: string, path: string): boolean {
  const fromRoot = relative(root, path);
  return !fromRoot.startsWith('..') && !isAbsolute(fromRoot);
}
