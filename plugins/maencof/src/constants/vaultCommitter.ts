import { MAENCOF_META_DIR } from './directories.js';

/** `.maencof-meta/` 하위 vault auto-commit 설정 파일 이름. */
export const VAULT_COMMIT_CONFIG_FILE = 'vault-commit.json';

/**
 * Default auto-commit scope: the 5-Layer document tree plus vault metadata.
 * Kept in sync with LAYER_DIR (architecture.ts) — not imported so hook
 * bundles stay free of the runtime Layer enum. The `.maencof/` graph cache
 * is rebuildable and intentionally excluded.
 */
export const DEFAULT_COMMIT_SCOPE: readonly string[] = [
  '01_Core/',
  '02_Derived/',
  '03_External/',
  '04_Action/',
  '05_Context/',
  `${MAENCOF_META_DIR}/`,
];

/**
 * Staging-time sensitive-file guard appended to every `git add` — second
 * line of defense behind the vault's .gitignore. Non-markdown signals only
 * (.json / .pem / .key / .env) so knowledge documents such as
 * `design-tokens.md` are never excluded.
 */
export const SENSITIVE_EXCLUDE_PATH_SPECS: readonly string[] = [
  ':(exclude,icase,glob)**/*credential*.json',
  ':(exclude,icase,glob)**/*secret*.json',
  ':(exclude,icase,glob)**/*token*.json',
  ':(exclude,icase,glob)**/*apikey*.json',
  ':(exclude,icase,glob)**/*api-key*.json',
  ':(exclude,icase,glob)**/*.pem',
  ':(exclude,icase,glob)**/*.key',
  ':(exclude,icase,glob)**/.env',
  ':(exclude,icase,glob)**/.env.*',
];

/**
 * Commit subjects the daily fold recognizes as maencof-managed auto commits.
 * Covers the current `session wrap` format, the legacy `*_session_wrap`
 * format, and the retired vault-local scripts' subjects so pre-existing
 * histories keep folding seamlessly.
 */
export const AUTO_COMMIT_SUBJECT_MARKERS: readonly string[] = [
  'chore(maencof): session wrap',
  '_session_wrap',
  'auto-commit knowledge tree',
  'daily knowledge tree',
  'auto-commit on session end',
];

/** Upper bound of commits walked when locating today's fold base. */
export const FOLD_SCAN_MAX_COMMITS = 100;

/**
 * Message-template placeholder tokens — single source of truth. Each token
 * MUST have a replacer registered in MESSAGE_TEMPLATE_REPLACERS (gitUtils);
 * the renderer's `satisfies Record<PlaceholderToken, ...>` enforces the
 * pairing at compile time.
 */
export const MESSAGE_PLACEHOLDERS = {
  /** Staged top-level directories, comma-joined. */
  DIRS: '{dirs}',
  /** Staged file count. */
  COUNT: '{count}',
  /** Commit date, YYYY-MM-DD. */
  DATE: '{date}',
  /** Commit time, HH:MM. */
  TIME: '{time}',
} as const;

/** Default commit-message template. Unknown placeholders pass through untouched. */
export const DEFAULT_MESSAGE_TEMPLATE = `chore(maencof): session wrap [${MESSAGE_PLACEHOLDERS.DIRS}] (${MESSAGE_PLACEHOLDERS.DATE} ${MESSAGE_PLACEHOLDERS.TIME})`;

/**
 * Minimum length (after trim) of a custom template's static prefix (text
 * before the first placeholder). The prefix doubles as the fold's
 * auto-commit marker via startsWith matching; a shorter prefix would
 * misidentify hand-written commits as foldable.
 */
export const MESSAGE_TEMPLATE_MIN_PREFIX_CHARS = 6;

/**
 * Default commit-trigger pattern: a prompt matching `/clear` commits the vault
 * right before the context is wiped. The `SKIP` name does not describe the
 * trigger semantics but is kept — the `skip_patterns` config field name must
 * stay backward compatible with existing user configs. Users may override /
 * extend via `vault-commit.json::skip_patterns`; this default applies only
 * when the field is missing or malformed.
 */
export const DEFAULT_SKIP_PATTERN_SOURCE = '^\\s*/clear\\s*$';
