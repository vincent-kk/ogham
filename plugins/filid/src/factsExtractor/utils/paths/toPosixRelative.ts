import { relative, sep } from 'node:path';

/**
 * A path relative to a root, with POSIX separators.
 * @param root Absolute root.
 * @param path Absolute path.
 * @returns The relative path; it starts with `..` when `path` lies outside `root`.
 */
export function toPosixRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join('/');
}
