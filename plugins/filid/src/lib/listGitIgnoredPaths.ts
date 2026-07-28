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
 * Returns nothing when git is absent or the root sits outside a work tree.
 * An unavailable git must never shrink what a scan reports.
 */
import { spawnCliSync } from '@ogham/cross-platform/spawn';

const LIST_IGNORED_ARGUMENTS = [
  'ls-files',
  '--others',
  '--ignored',
  '--exclude-standard',
  '--directory',
  '-z',
];

export function listGitIgnoredPaths(rootPath: string): string[] {
  const result = spawnCliSync('git', LIST_IGNORED_ARGUMENTS, {
    cwd: rootPath,
  });
  if (result.spawnError || result.code !== 0) return [];
  return result.stdout.split('\0').filter((entry) => entry.length > 0);
}
