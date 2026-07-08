/**
 * @file gitUtils.ts
 * @description Git primitives for vault-committer hook — repo detection, scoped staging, commit
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { SpawnResult } from '@ogham/cross-platform/spawn';
import { spawnCli } from '@ogham/cross-platform/spawn';

import {
  GIT_EXEC_TIMEOUT_MS,
  GIT_LOCK_RETRY_DELAYS_MS,
} from '../../../constants/performance.js';
import {
  DEFAULT_MESSAGE_TEMPLATE,
  MESSAGE_PLACEHOLDERS,
  SENSITIVE_EXCLUDE_PATH_SPECS,
} from '../../../constants/vaultCommitter.js';
import { formatDate, formatTime } from '../../../core/dateFormat/dateFormat.js';

// ── Runner ───────────────────────────────────────────────────────────

function isIndexLockFailure(result: SpawnResult): boolean {
  return result.code !== 0 && result.stderr.includes('index.lock');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run git, retrying with backoff while another process holds .git/index.lock. */
export async function runGit(
  cwd: string,
  args: readonly string[],
): Promise<SpawnResult> {
  let result = await spawnCli('git', [...args], {
    cwd,
    timeoutMs: GIT_EXEC_TIMEOUT_MS,
  });
  for (const delayMs of GIT_LOCK_RETRY_DELAYS_MS) {
    if (!isIndexLockFailure(result)) return result;
    await sleep(delayMs);
    result = await spawnCli('git', [...args], {
      cwd,
      timeoutMs: GIT_EXEC_TIMEOUT_MS,
    });
  }
  return result;
}

// ── Repo helpers ─────────────────────────────────────────────────────

export async function isGitRepo(cwd: string): Promise<boolean> {
  const result = await runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  return result.code === 0 && !result.spawnError;
}

export async function getGitRoot(cwd: string): Promise<string | null> {
  const result = await runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (result.code !== 0 || result.spawnError) return null;
  return result.stdout.trim();
}

export function isIndexLocked(gitRoot: string): boolean {
  return existsSync(join(gitRoot, '.git', 'index.lock'));
}

// ── Staging / commit ─────────────────────────────────────────────────

export async function hasVaultChanges(
  cwd: string,
  scope: readonly string[],
): Promise<boolean> {
  const result = await runGit(cwd, ['status', '--porcelain', '--', ...scope]);
  if (result.code !== 0 || result.spawnError) return false;
  return result.stdout.trim().length > 0;
}

/**
 * Stage the scope entries that exist on disk in a single `git add`, always
 * carrying the sensitive-file exclude pathspecs.
 */
export async function stageVaultChanges(
  cwd: string,
  scope: readonly string[],
): Promise<void> {
  const present = scope.filter((entry) => existsSync(join(cwd, entry)));
  if (present.length === 0) return;
  const add = await runGit(cwd, [
    'add',
    '--',
    ...present,
    ...SENSITIVE_EXCLUDE_PATH_SPECS,
  ]);
  if (add.code !== 0 || add.spawnError)
    throw new Error(
      `git add failed: ${add.stderr.trim() || add.spawnError?.message || `exit ${add.code}`}`,
    );
}

export async function listStagedFiles(cwd: string): Promise<string[]> {
  const result = await runGit(cwd, ['diff', '--cached', '--name-only']);
  if (result.code !== 0 || result.spawnError) return [];
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function commitStaged(
  cwd: string,
  commitMessage: string,
): Promise<void> {
  const commit = await runGit(cwd, [
    'commit',
    '--no-verify',
    '-m',
    commitMessage,
  ]);
  if (commit.code !== 0 || commit.spawnError)
    throw new Error(
      `git commit failed: ${commit.stderr.trim() || commit.spawnError?.message || `exit ${commit.code}`}`,
    );
}

// ── Commit message ───────────────────────────────────────────────────

/**
 * Unique top-level directories of the staged paths, ordered by scope
 * position; entries outside the scope sort last, alphabetically.
 */
export function stagedTopLevels(
  stagedFiles: readonly string[],
  scope: readonly string[],
): string[] {
  const order = scope.map((entry) => entry.replace(/\/+$/, ''));
  const rank = (name: string) => {
    const index = order.indexOf(name);
    return index === -1 ? order.length : index;
  };
  const unique = [...new Set(stagedFiles.map((file) => file.split('/')[0]))];
  return unique.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Static prefix of a message template (text before the first placeholder). */
export function templateStaticPrefix(template: string): string {
  return template.split('{')[0];
}

/** Values available to message-template placeholder replacers. */
export interface CommitMessageContext {
  topLevels: readonly string[];
  fileCount: number;
  now: Date;
}

type PlaceholderToken =
  (typeof MESSAGE_PLACEHOLDERS)[keyof typeof MESSAGE_PLACEHOLDERS];

/**
 * Message-template placeholder registry, keyed by MESSAGE_PLACEHOLDERS
 * tokens. To support a new placeholder: add its token to
 * MESSAGE_PLACEHOLDERS, register the replacer here (the `satisfies` clause
 * fails to compile while the pairing is incomplete, extending
 * CommitMessageContext if it needs a new value source), and document it in
 * vaultCommitter DETAIL.md.
 */
export const MESSAGE_TEMPLATE_REPLACERS = {
  [MESSAGE_PLACEHOLDERS.DIRS]: ({ topLevels }) => topLevels.join(', '),
  [MESSAGE_PLACEHOLDERS.COUNT]: ({ fileCount }) => String(fileCount),
  [MESSAGE_PLACEHOLDERS.DATE]: ({ now }) => formatDate(now),
  [MESSAGE_PLACEHOLDERS.TIME]: ({ now }) => formatTime(now),
} as const satisfies Record<
  PlaceholderToken,
  (context: CommitMessageContext) => string
>;

/**
 * Render the auto-commit message from a template, default e.g.
 * `chore(maencof): session wrap [01_Core, 04_Action] (2026-07-08 10:05)`.
 * Placeholders come from MESSAGE_TEMPLATE_REPLACERS; unknown ones pass
 * through untouched. The template's static prefix doubles as a fold marker
 * (see AUTO_COMMIT_SUBJECT_MARKERS and foldDaily) — keep them consistent.
 */
export function generateCommitMessage(
  topLevels: readonly string[],
  fileCount: number,
  template: string = DEFAULT_MESSAGE_TEMPLATE,
): string {
  const context: CommitMessageContext = {
    topLevels,
    fileCount,
    now: new Date(),
  };
  return Object.entries(MESSAGE_TEMPLATE_REPLACERS).reduce(
    (message, [placeholder, replace]) =>
      message.replaceAll(placeholder, replace(context)),
    template,
  );
}
