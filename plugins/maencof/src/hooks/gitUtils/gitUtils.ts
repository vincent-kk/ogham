/**
 * @file gitUtils.ts
 * @description Git helper utilities for vault-committer hook — repo detection, status, commit
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { spawnCli } from '@ogham/cross-platform';

import { GIT_EXEC_TIMEOUT_MS } from '../../constants/performance.js';
import { MAENCOF_DIR, MAENCOF_META_DIR } from '../shared/index.js';

// ── Helpers ──────────────────────────────────────────────────────────

export async function isGitRepo(cwd: string): Promise<boolean> {
  const result = await spawnCli('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd,
    timeoutMs: GIT_EXEC_TIMEOUT_MS,
  });
  return result.code === 0 && !result.spawnError;
}

export async function getGitRoot(cwd: string): Promise<string | null> {
  const result = await spawnCli('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    timeoutMs: GIT_EXEC_TIMEOUT_MS,
  });
  if (result.code !== 0 || result.spawnError) return null;
  return result.stdout.trim();
}

export function isIndexLocked(gitRoot: string): boolean {
  return existsSync(join(gitRoot, '.git', 'index.lock'));
}

export async function hasVaultChanges(cwd: string): Promise<boolean> {
  const result = await spawnCli(
    'git',
    ['status', '--porcelain', '--', MAENCOF_DIR + '/', MAENCOF_META_DIR + '/'],
    { cwd, timeoutMs: GIT_EXEC_TIMEOUT_MS },
  );
  if (result.code !== 0 || result.spawnError) return false;
  return result.stdout.trim().length > 0;
}

export async function commitVaultChanges(
  cwd: string,
  commitMessage: string,
): Promise<void> {
  // Add each directory separately — if one doesn't exist, the other still gets staged
  for (const dir of [MAENCOF_DIR, MAENCOF_META_DIR]) {
    if (existsSync(join(cwd, dir))) {
      const add = await spawnCli('git', ['add', `${dir}/`], {
        cwd,
        timeoutMs: GIT_EXEC_TIMEOUT_MS,
      });
      if (add.code !== 0 || add.spawnError) {
        throw new Error(
          `git add ${dir}/ failed: ${add.stderr.trim() || add.spawnError?.message || `exit ${add.code}`}`,
        );
      }
    }
  }
  const commit = await spawnCli(
    'git',
    ['commit', '--no-verify', '-m', commitMessage],
    { cwd, timeoutMs: GIT_EXEC_TIMEOUT_MS },
  );
  if (commit.code !== 0 || commit.spawnError) {
    throw new Error(
      `git commit failed: ${commit.stderr.trim() || commit.spawnError?.message || `exit ${commit.code}`}`,
    );
  }
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
