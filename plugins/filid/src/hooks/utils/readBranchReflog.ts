import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findGitDir } from './findGitDir.js';

export interface BranchReflogSummary {
  /** Epoch ms of the first reflog entry — approximates branch creation. */
  createdAtMs: number | null;
  /** Ref updates recorded for the branch (commits / amends / resets). */
  updateCount: number;
}

/**
 * Summarize a branch's reflog (`logs/refs/heads/<branch>`) without spawning
 * git. Worktree-safe: branch reflogs live in the common git dir. Returns
 * null when the reflog is absent or unreadable (e.g. reflogs disabled).
 */
export function readBranchReflog(
  cwd: string,
  branch: string,
): BranchReflogSummary | null {
  const dirs = findGitDir(cwd);
  if (dirs === null) return null;
  try {
    const content = readFileSync(
      join(dirs.commonDir, 'logs', 'refs', 'heads', ...branch.split('/')),
      'utf-8',
    );
    const lines = content.split('\n').filter((line) => line.length > 0);
    if (lines.length === 0) return null;
    // Reflog line: `<old> <new> Author <email> <epoch> <tz>\t<message>`
    const header = lines[0].split('\t')[0];
    const stamp = /(\d{9,12})\s[+-]\d{4}$/.exec(header);
    return {
      createdAtMs: stamp === null ? null : Number(stamp[1]) * 1000,
      updateCount: lines.length,
    };
  } catch {
    return null;
  }
}
