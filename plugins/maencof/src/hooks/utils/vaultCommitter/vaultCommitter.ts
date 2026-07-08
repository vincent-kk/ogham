/**
 * @file vaultCommitter.ts
 * @description SessionEnd / /clear Hook — Auto-commit vault changes (scope-driven, default: 5-Layer tree + .maencof-meta/)
 *
 * Triggers: SessionEnd (session exit) and UserPromptSubmit (when prompt matches skip_patterns, default /clear)
 * Opt-in only: requires .maencof-meta/vault-commit.json with { "enabled": true }
 * Always returns { continue: true } — never blocks session exit or prompt submission.
 */
import { existsSync, readFileSync } from 'node:fs';

// ── Constants ────────────────────────────────────────────────────────

import {
  DEFAULT_COMMIT_SCOPE,
  DEFAULT_SKIP_PATTERN_SOURCE,
  MESSAGE_TEMPLATE_MIN_PREFIX_CHARS,
  VAULT_COMMIT_CONFIG_FILE,
} from '../../../constants/vaultCommitter.js';
import { appendErrorLogSafe } from '../../../core/errorLog/errorLog.js';
import { isMaencofVault } from '../../shared/isMaencofVault.js';
import { metaPath } from '../../shared/metaPath.js';
import {
  commitStaged,
  generateCommitMessage,
  getGitRoot,
  hasVaultChanges,
  isGitRepo,
  isIndexLocked,
  listStagedFiles,
  stageVaultChanges,
  stagedTopLevels,
  templateStaticPrefix,
} from '../gitUtils/gitUtils.js';

import { tryFoldCommit } from './helpers/foldDaily/foldDaily.js';

// ── Types ────────────────────────────────────────────────────────────

export interface VaultCommitConfig {
  enabled: boolean;
  /**
   * Commit scope: vault-root-relative directory/file list (`/` separator),
   * or `["."]` to commit the whole vault root with exclusions delegated to
   * .gitignore. Entries that are absolute, contain `..` or `:`, or point at
   * `.git` are dropped. Absent or empty -> DEFAULT_COMMIT_SCOPE (5-Layer
   * tree + .maencof-meta/).
   */
  scope?: string[];
  /** Daily single-commit folding (helpers/foldDaily). Defaults to true. */
  fold_daily?: boolean;
  /**
   * Commit-message template. Placeholders: {dirs}, {count}, {date}, {time}.
   * The static prefix before the first placeholder must be at least
   * MESSAGE_TEMPLATE_MIN_PREFIX_CHARS long (after trim) — it doubles as the
   * fold's auto-commit marker. Invalid values are silently ignored in
   * favour of DEFAULT_MESSAGE_TEMPLATE.
   */
  message_template?: string;
  /**
   * Regex source strings that, when matched against a UserPromptSubmit prompt,
   * TRIGGER the commit (default `/clear` — commit right before the context is
   * wiped). Defaults to `[DEFAULT_SKIP_PATTERN_SOURCE]` when the field is
   * absent or malformed. The `skip_patterns` name does not describe the
   * trigger semantics but is kept — renaming would break existing user
   * `.maencof-meta/vault-commit.json` configs.
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

export { DEFAULT_SKIP_PATTERN_SOURCE };

// ── Config Reader ────────────────────────────────────────────────────

function isSafeScopeEntry(entry: unknown): entry is string {
  return (
    typeof entry === 'string' &&
    entry.length > 0 &&
    !entry.startsWith('/') &&
    !entry.includes(':') &&
    !entry.includes('..') &&
    entry !== '.git' &&
    !entry.startsWith('.git/')
  );
}

/**
 * Read and validate vault-commit.json. Returns null if missing, malformed, or disabled.
 * `scope`, `fold_daily`, and `skip_patterns` are optional; invalid entries are
 * dropped item-by-item but do not invalidate the whole config. Unknown fields
 * are ignored (legacy hand-written configs).
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
      const fields = parsed as Record<string, unknown>;
      if (Array.isArray(fields.scope)) {
        const validScope = fields.scope.filter(isSafeScopeEntry);
        if (validScope.length > 0) config.scope = validScope;
      }
      if (typeof fields.fold_daily === 'boolean')
        config.fold_daily = fields.fold_daily;
      if (
        typeof fields.message_template === 'string' &&
        templateStaticPrefix(fields.message_template).trim().length >=
          MESSAGE_TEMPLATE_MIN_PREFIX_CHARS
      )
        config.message_template = fields.message_template;
      if (Array.isArray(fields.skip_patterns)) {
        const validPatterns = fields.skip_patterns.filter(
          (p): p is string => typeof p === 'string' && p.length > 0,
        );
        if (validPatterns.length > 0) config.skip_patterns = validPatterns;
      }
      return config;
    }
    return null;
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'vault-committer',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
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
  for (const source of sources)
    try {
      result.push(new RegExp(source, 'i'));
    } catch {
      // malformed regex — skip silently (error-log already captures it upstream
      // when the config reader fails to parse a non-string entry)
    }

  return result;
}

/**
 * Decide whether a UserPromptSubmit prompt should trigger vault commit.
 * A match on `config.skip_patterns` (naming caveat — see VaultCommitConfig)
 * means COMMIT NOW; no match means this prompt does not trigger the committer.
 * Falls back to the `/clear` trigger via `DEFAULT_SKIP_PATTERN_SOURCE`.
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
 *       → scoped change check → stage (sensitive excludes ride along)
 *       → daily fold OR plain commit → return
 *
 * For UserPromptSubmit: only proceeds when prompt matches skip_patterns.
 * Every step that fails silently returns { continue: true }.
 */
export async function runVaultCommitter(
  input: VaultCommitterInput,
  event?: VaultCommitterEvent,
): Promise<VaultCommitterResult> {
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
    if (!(await isGitRepo(cwd))) return { continue: true };

    // 4. Index lock check
    const gitRoot = await getGitRoot(cwd);
    if (!gitRoot || isIndexLocked(gitRoot)) return { continue: true };

    // 5. Scoped vault changes check
    const scope = config.scope ?? DEFAULT_COMMIT_SCOPE;
    if (!(await hasVaultChanges(cwd, scope))) return { continue: true };

    // 6. Stage; nothing staged (e.g. sensitive-only changes) -> nothing to commit
    await stageVaultChanges(cwd, scope);
    const staged = await listStagedFiles(cwd);
    if (staged.length === 0) return { continue: true };

    // 7. Daily fold first; fall back to a plain commit
    if (
      config.fold_daily !== false &&
      (await tryFoldCommit(cwd, scope, config.message_template))
    )
      return { continue: true };
    await commitStaged(
      cwd,
      generateCommitMessage(
        stagedTopLevels(staged, scope),
        staged.length,
        config.message_template,
      ),
    );
  } catch (e) {
    const cwd = input.cwd ?? process.cwd();
    appendErrorLogSafe(cwd, {
      hook: 'vault-committer',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  return { continue: true };
}
