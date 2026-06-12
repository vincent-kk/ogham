import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findGitDir } from './findGitDir.js';

/**
 * Read the current branch name from `.git/HEAD` without spawning git.
 * Worktree-safe: HEAD lives in the worktree-local git dir.
 * Returns null on detached HEAD, missing repo, or unreadable metadata.
 */
export function readCurrentBranch(cwd: string): string | null {
  const dirs = findGitDir(cwd);
  if (dirs === null) return null;
  try {
    const head = readFileSync(join(dirs.gitDir, 'HEAD'), 'utf-8').trim();
    const match = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
    return match === null ? null : match[1];
  } catch {
    return null;
  }
}
