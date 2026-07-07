/** `.maencof-meta/` 하위 vault auto-commit 설정 파일 이름. */
export const VAULT_COMMIT_CONFIG_FILE = 'vault-commit.json';

/**
 * Default commit-trigger pattern: a prompt matching `/clear` commits the vault
 * right before the context is wiped. The `SKIP` name does not describe the
 * trigger semantics but is kept — the `skip_patterns` config field name must
 * stay backward compatible with existing user configs. Users may override /
 * extend via `vault-commit.json::skip_patterns`; this default applies only
 * when the field is missing or malformed.
 */
export const DEFAULT_SKIP_PATTERN_SOURCE = '^\\s*/clear\\s*$';
