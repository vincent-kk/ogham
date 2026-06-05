import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Walk up from `cwd` to the project root that holds `.filid/config.json`.
 *
 * Mirrors the config-loader's git-root resolution (`loadConfig` → `resolveGitRoot`)
 * without spawning git or importing the zod-heavy loader: `.filid/config.json`
 * is written at the project (git) root, so the nearest ancestor that contains it
 * IS that root. The walk stops at the git root (a `.git` entry — directory in a
 * normal clone, file in a worktree/submodule) so it never escapes the repository
 * into an unrelated ancestor's config.
 *
 * Returns the directory containing `.filid/config.json`, or null when none is
 * found up to (and including) the git root or the filesystem root.
 */
export function findConfigRoot(cwd: string): string | null {
  let cursor = cwd;
  while (true) {
    if (existsSync(join(cursor, '.filid', 'config.json'))) return cursor;
    if (existsSync(join(cursor, '.git'))) return null;
    const parent = dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}
