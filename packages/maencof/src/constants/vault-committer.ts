/** `.maencof-meta/` 하위 vault auto-commit 설정 파일 이름. */
export const VAULT_COMMIT_CONFIG_FILE = 'vault-commit.json';

/**
 * Default skip pattern — preserves the v0.2.x behavior of bailing on `/clear`.
 * Users may override / extend via `vault-commit.json::skip_patterns` without
 * touching source code. The default list is injected as a fallback only when
 * the config field is missing or malformed.
 */
export const DEFAULT_SKIP_PATTERN_SOURCE = '^\\s*/clear\\s*$';
