/**
 * @file listGitIgnoredPaths.ts
 * @description Ask git which paths it ignores, in one call.
 *
 * `--others` is what makes "ignored AND not tracked" structural rather than a
 * second cross-check: a force-added file lives in the index, so git never
 * reports it here. `--directory` collapses a wholly ignored directory to one
 * trailing-slash entry instead of listing every file beneath it — the reason
 * a repository with `node_modules/` still answers in milliseconds. `-z`
 * output is never quoted, so entries need no unescaping.
 *
 * Returns nothing when git is absent, when the root sits outside a work tree,
 * or when git refuses the query — it exits non-zero if the root is itself
 * inside an ignored directory. An unavailable git must never shrink what a
 * scan reports.
 *
 * Reads the request-scoped memo opened by `runWithRequestMemo`, which cannot
 * be passed in: the callers between that scope and this function reach it
 * through adapter interfaces that carry no cache. With no scope open git runs
 * on every call.
 */
import { spawnCliSync } from '@ogham/cross-platform';

import { memoizeWithinRequest } from './memoizeWithinRequest.js';

/**
 * Memo namespace. The key is the root exactly as the caller spelled it, which
 * is also what git receives as its working directory — the one form that keys
 * the query it actually ran.
 */
const MEMO_NAMESPACE = 'listGitIgnoredPaths';

const LIST_IGNORED_ARGUMENTS = [
  'ls-files',
  '--others',
  '--ignored',
  '--exclude-standard',
  '--directory',
  '-z',
];

export function listGitIgnoredPaths(rootPath: string): string[] {
  const entries = memoizeWithinRequest(
    MEMO_NAMESPACE,
    rootPath,
    (): string[] => {
      const result = spawnCliSync('git', LIST_IGNORED_ARGUMENTS, {
        cwd: rootPath,
      });
      if (result.spawnError || result.code !== 0) return [];
      return result.stdout.split('\0').filter((entry) => entry.length > 0);
    },
  );
  return [...entries];
}
