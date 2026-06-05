import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Check whether `cwd` is inside an FCA-AI project.
 *
 * Walks up from `cwd` looking for a `.filid/` marker or an `INTENT.md`, bounded
 * by the git root (a `.git` entry), so a hook firing from a subdirectory (a
 * monorepo package, an organ dir, …) still detects the project instead of
 * silently skipping. Returns on the first marker found, so the common case
 * (`cwd` === project root) still costs a single `existsSync`.
 */
export function isFcaProject(cwd: string): boolean {
  let cursor = cwd;
  let parent;
  while (true) {
    if (
      existsSync(join(cursor, '.filid')) ||
      existsSync(join(cursor, 'INTENT.md'))
    )
      return true;
    if (existsSync(join(cursor, '.git'))) return false;
    parent = dirname(cursor);
    if (parent === cursor) return false;
    cursor = parent;
  }
}
