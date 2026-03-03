/**
 * @file git-utils.ts
 * @description Git helper utilities for vault-committer hook — repo detection, status, commit
 */
import { existsSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { join } from 'node:path';

// ── Constants ────────────────────────────────────────────────────────

export const EXEC_TIMEOUT_MS = 1500;

// ── Helpers ──────────────────────────────────────────────────────────

export const execOpts = (cwd: string) =>
  ({ cwd, timeout: EXEC_TIMEOUT_MS, stdio: 'pipe' as const });

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
  execFileSync('git', ['add', '.maencof/', '.maencof-meta/'], execOpts(cwd));
  execFileSync(
    'git',
    ['commit', '--no-verify', '-m', commitMessage],
    execOpts(cwd),
  );
}
