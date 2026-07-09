/**
 * @file types.ts
 * @description vault-committer public types — config schema, hook I/O, event tag.
 */
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
