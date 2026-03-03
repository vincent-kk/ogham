/**
 * @file git-utils.ts
 * @description Git helper utilities for vault-committer hook — repo detection, status, commit
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { MAENCOF_DIR, MAENCOF_META_DIR } from './shared.js';

// ── Constants ────────────────────────────────────────────────────────

export const EXEC_TIMEOUT_MS = 1500;

// ── Helpers ──────────────────────────────────────────────────────────

export const execOpts = (cwd: string) => ({
  cwd,
  timeout: EXEC_TIMEOUT_MS,
  stdio: 'pipe' as const,
});

export function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', execOpts(cwd));
    return true;
  } catch {
    return false;
  }
}

export function getGitRoot(cwd: string): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', execOpts(cwd))
      .toString()
      .trim();
  } catch {
    return null;
  }
}

export function isIndexLocked(gitRoot: string): boolean {
  return existsSync(join(gitRoot, '.git', 'index.lock'));
}

export function hasVaultChanges(cwd: string): boolean {
  try {
    const output = execSync(
      'git status --porcelain -- .maencof/ .maencof-meta/',
      execOpts(cwd),
    )
      .toString()
      .trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

export function commitVaultChanges(cwd: string, commitMessage: string): void {
  // Add each directory separately — if one doesn't exist, the other still gets staged
  for (const dir of [MAENCOF_DIR, MAENCOF_META_DIR]) {
    if (existsSync(join(cwd, dir))) {
      execFileSync('git', ['add', `${dir}/`], execOpts(cwd));
    }
  }
  execFileSync(
    'git',
    ['commit', '--no-verify', '-m', commitMessage],
    execOpts(cwd),
  );
}

/**
 * Generate a timestamped commit message for vault auto-commits.
 * Format: `chore(maencof): yyyy_MM_dd:HH_mm_ss_session_wrap`
 */
export function generateCommitMessage(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}:${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
  return `chore(maencof): ${ts}_session_wrap`;
}
