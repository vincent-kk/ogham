import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export interface GitDirs {
  /** Worktree-local git dir (holds HEAD). */
  gitDir: string;
  /** Shared git dir (holds refs/, logs/, packed-refs). */
  commonDir: string;
}

/**
 * Locate the git metadata directories for `cwd` without spawning git.
 *
 * Walks up from `cwd` to the first `.git` entry. A `.git` directory is used
 * as-is; a `.git` file (linked worktree / submodule) is dereferenced via its
 * `gitdir: <path>` line. The common dir (shared refs/logs) follows
 * `<gitDir>/commondir` when present, else equals gitDir.
 *
 * Returns null when no `.git` is found or the metadata is unreadable.
 */
export function findGitDir(cwd: string): GitDirs | null {
  let cursor = cwd;
  while (true) {
    const candidate = join(cursor, '.git');
    if (existsSync(candidate))
      try {
        let gitDir: string;
        if (statSync(candidate).isDirectory()) gitDir = candidate;
        else {
          const match = /^gitdir:\s*(.+)$/m.exec(
            readFileSync(candidate, 'utf-8'),
          );
          if (match === null) return null;
          const target = match[1].trim();
          gitDir = isAbsolute(target) ? target : resolve(cursor, target);
        }
        let commonDir = gitDir;
        const commonFile = join(gitDir, 'commondir');
        if (existsSync(commonFile)) {
          const common = readFileSync(commonFile, 'utf-8').trim();
          commonDir = isAbsolute(common) ? common : resolve(gitDir, common);
        }
        return { gitDir, commonDir };
      } catch {
        return null;
      }

    const parent = dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}
