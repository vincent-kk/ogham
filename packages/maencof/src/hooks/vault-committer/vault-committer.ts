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
} from '../git-utils/index.js';
import { appendErrorLogSafe } from '../../core/error-log/index.js';
import { isMaencofVault, metaPath } from '../shared/index.js';

// ── Types ────────────────────────────────────────────────────────────

export interface VaultCommitConfig {
  enabled: boolean;
  /**
   * Regex source strings that, when matched against a UserPromptSubmit prompt,
   * force the committer to skip. Defaults to `[DEFAULT_SKIP_PATTERN_SOURCE]`
   * (matching `/clear`) when the field is absent or malformed. Y3 externalized
   * the skip-match policy from hard-coded regex to `.maencof-meta/vault-commit.json`
   * so users can add their own trigger prompts without code changes.
   */
  skip_patterns?: string[];
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

/**
 * Default skip pattern — preserves the v0.2.x behavior of bailing on `/clear`.
 * Y3: users may override / extend via `vault-commit.json::skip_patterns` without
 * touching source code. The default list is injected as a fallback only when
 * the config field is missing or malformed.
 */
export const DEFAULT_SKIP_PATTERN_SOURCE = '^\\s*/clear\\s*$';

// ── Config Reader ────────────────────────────────────────────────────

/**
 * Read and validate vault-commit.json. Returns null if missing, malformed, or disabled.
 * `skip_patterns` (Y3) is accepted when present and is expected to be a
 * `string[]`; invalid entries are dropped but do not invalidate the whole
 * config.
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
      const config: VaultCommitConfig = {
        enabled: (parsed as VaultCommitConfig).enabled,
      };
      const rawPatterns = (parsed as Record<string, unknown>).skip_patterns;
      if (Array.isArray(rawPatterns)) {
        const validPatterns = rawPatterns.filter(
          (p): p is string => typeof p === 'string' && p.length > 0,
        );
        if (validPatterns.length > 0) {
          config.skip_patterns = validPatterns;
        }
      }
      return config;
    }
    return null;
  } catch (e) {
    appendErrorLogSafe(cwd, { hook: 'vault-committer', error: String(e), timestamp: new Date().toISOString() });
    return null;
  }
}

// ── Prompt Detection ─────────────────────────────────────────────────

/**
 * Compile the configured skip patterns with case-insensitive matching.
 * Invalid regex sources are silently dropped so one bad entry can never
 * disable the whole trigger.
 */
function compileSkipPatterns(sources: readonly string[]): RegExp[] {
  const result: RegExp[] = [];
  for (const source of sources) {
    try {
      result.push(new RegExp(source, 'i'));
    } catch {
      // malformed regex — skip silently (error-log already captures it upstream
      // when the config reader fails to parse a non-string entry)
    }
  }
  return result;
}

/**
 * Decide whether a UserPromptSubmit prompt should trigger vault commit.
 * Uses `config.skip_patterns` when supplied (Y3); otherwise falls back to the
 * legacy `/clear` behavior via `DEFAULT_SKIP_PATTERN_SOURCE`.
 */
export function shouldCommitOnPrompt(
  prompt: string,
  config: VaultCommitConfig | null,
): boolean {
  const sources =
    config?.skip_patterns && config.skip_patterns.length > 0
      ? config.skip_patterns
      : [DEFAULT_SKIP_PATTERN_SOURCE];
  const patterns = compileSkipPatterns(sources);
  return patterns.some((p) => p.test(prompt));
}

/**
 * Backward-compatible helper retained for existing call sites (e.g., dedicated
 * "/clear" unit tests). Use `shouldCommitOnPrompt` for the full configurable
 * check.
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
    const cwd = input.cwd ?? process.cwd();

    // 1. Vault check
    if (!isMaencofVault(cwd)) return { continue: true };

    // 2. Config check — opt-in only
    const config = readVaultCommitConfig(cwd);
    if (!config || !config.enabled) return { continue: true };

    // 0. Event gate — for UserPromptSubmit, consult configurable skip patterns
    //    (Y3). Config is read first so user-provided `skip_patterns` govern
    //    the trigger; absent or empty config falls back to `/clear`.
    if (event === 'UserPromptSubmit') {
      const prompt = input.prompt ?? '';
      if (!shouldCommitOnPrompt(prompt, config)) return { continue: true };
    }

    // 3. Git repo check
    if (!isGitRepo(cwd)) return { continue: true };

    // 4. Index lock check
    const gitRoot = getGitRoot(cwd);
    if (!gitRoot || isIndexLocked(gitRoot)) return { continue: true };

    // 5. Vault changes check
    if (!hasVaultChanges(cwd)) return { continue: true };

    // 6. Stage and commit
    commitVaultChanges(cwd, generateCommitMessage());
  } catch (e) {
    const cwd = input.cwd ?? process.cwd();
    appendErrorLogSafe(cwd, { hook: 'vault-committer', error: String(e), timestamp: new Date().toISOString() });
  }

  return { continue: true };
}
