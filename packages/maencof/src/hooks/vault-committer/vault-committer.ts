/**
 * @file vault-committer.ts
 * @description SessionEnd / /clear Hook — Auto-commit vault changes (.maencof/, .maencof-meta/)
 *
 * Triggers: SessionEnd (session exit) and UserPromptSubmit (when prompt is /clear)
 * Opt-in only: requires .maencof-meta/vault-commit.json with { "enabled": true }
 * Always returns { continue: true } — never blocks session exit or prompt submission.
 */
import { existsSync, readFileSync } from 'node:fs';

import {
  commitVaultChanges,
  generateCommitMessage,
  getGitRoot,
  hasVaultChanges,
  isGitRepo,
  isIndexLocked,
} from '../git-utils/git-utils.js';
import { isMaencofVault, metaPath } from '../shared/shared.js';

// ── Types ────────────────────────────────────────────────────────────

export interface VaultCommitConfig {
  enabled: boolean;
}

export interface VaultCommitterInput {
  session_id?: string;
  cwd?: string;
  /** User prompt text (available in UserPromptSubmit events). */
  prompt?: string;
}

/** Hook event name passed as CLI argument to distinguish trigger source. */
export type VaultCommitterEvent = 'SessionEnd' | 'UserPromptSubmit';

export interface VaultCommitterResult {
  continue: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

const VAULT_COMMIT_CONFIG_FILE = 'vault-commit.json';

// ── Config Reader ────────────────────────────────────────────────────

/**
 * Read and validate vault-commit.json. Returns null if missing, malformed, or disabled.
 */
export function readVaultCommitConfig(cwd: string): VaultCommitConfig | null {
  const configPath = metaPath(cwd, VAULT_COMMIT_CONFIG_FILE);
  if (!existsSync(configPath)) return null;
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'enabled' in parsed &&
      typeof (parsed as VaultCommitConfig).enabled === 'boolean'
    ) {
      return parsed as VaultCommitConfig;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Prompt Detection ─────────────────────────────────────────────────

/**
 * Check whether the user prompt is a /clear command.
 * Matches: "/clear", "/clear ", "/clear\n", etc.
 */
export function isClearCommand(prompt: string): boolean {
  return /^\s*\/clear\s*$/i.test(prompt);
}

// ── Main Handler ─────────────────────────────────────────────────────

/**
 * vault-committer hook handler.
 *
 * Flow: event gate → config check → vault check → git repo check → index.lock check
 *       → git status check → git add + commit → return
 *
 * For UserPromptSubmit: only proceeds when prompt matches /clear.
 * Every step that fails silently returns { continue: true }.
 */
export function runVaultCommitter(
  input: VaultCommitterInput,
  event?: VaultCommitterEvent,
): VaultCommitterResult {
  try {
    // 0. Event gate — for UserPromptSubmit, only proceed on /clear
    if (event === 'UserPromptSubmit') {
      const prompt = (input.prompt ?? '').trim();
      if (!isClearCommand(prompt)) return { continue: true };
    }

    const cwd = input.cwd ?? process.cwd();

    // 1. Vault check
    if (!isMaencofVault(cwd)) return { continue: true };

    // 2. Config check — opt-in only
    const config = readVaultCommitConfig(cwd);
    if (!config || !config.enabled) return { continue: true };

    // 3. Git repo check
    if (!isGitRepo(cwd)) return { continue: true };

    // 4. Index lock check
    const gitRoot = getGitRoot(cwd);
    if (!gitRoot || isIndexLocked(gitRoot)) return { continue: true };

    // 5. Vault changes check
    if (!hasVaultChanges(cwd)) return { continue: true };

    // 6. Stage and commit
    commitVaultChanges(cwd, generateCommitMessage());
  } catch {
    // Swallow all errors — must never block session exit
  }

  return { continue: true };
}
