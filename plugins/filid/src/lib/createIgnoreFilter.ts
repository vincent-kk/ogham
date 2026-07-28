/**
 * @file createIgnoreFilter.ts
 * @description Scan-scoped predicate for "git ignores this and does not track it".
 *
 * The returned filter IS the cache: one git call fills it, and every path in
 * a traversal reads from the captured set. Create it once per scan and share
 * it; creating one per path would spawn git per path.
 *
 * A collapsed directory entry covers everything beneath it, so a candidate is
 * matched by walking its ancestors up to the scan root. Outside a git work
 * tree the set is empty and the predicate is constantly false, which leaves a
 * scan identical to its behaviour before ignore filtering existed.
 */
import {
  pathForCompare,
  portableDirname,
  portableResolve,
} from '@ogham/cross-platform/paths';

import { listGitIgnoredPaths } from './listGitIgnoredPaths.js';

export type IgnoreFilter = (absolutePath: string) => boolean;

const TRAILING_SLASH = /\/$/;

export function createIgnoreFilter(rootPath: string): IgnoreFilter {
  const root = portableResolve(rootPath);
  const rootKey = pathForCompare(root);
  const ignored = new Set(
    listGitIgnoredPaths(root).map((entry) =>
      pathForCompare(portableResolve(root, entry.replace(TRAILING_SLASH, ''))),
    ),
  );
  if (ignored.size === 0) return () => false;
  return (absolutePath: string): boolean => {
    let cursor = pathForCompare(portableResolve(absolutePath));
    while (cursor !== rootKey) {
      if (ignored.has(cursor)) return true;
      const parent = pathForCompare(portableDirname(cursor));
      if (parent === cursor) return false;
      cursor = parent;
    }
    return false;
  };
}
