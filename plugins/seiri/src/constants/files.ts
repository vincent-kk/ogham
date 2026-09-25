/** Project-local directory holding seiri's own configuration. */
export const CONFIG_DIR = '.seiri';

/** Configuration file inside {@link CONFIG_DIR}. Committed — the baseline. */
export const CONFIG_FILE = 'config.json';

/** Session-independent task directories inside {@link CONFIG_DIR}. */
export const TASKS_DIR = 'tasks';

/** Human-authored implementation plan inside one task directory. */
export const PLAN_FILE = 'plan.md';

/** Machine-readable task gate ledger inside one task directory. */
export const GATES_FILE = 'gates.md';

/** Ephemeral lock directory serializing one task ledger mutation. */
export const GATES_LOCK_DIR = 'gates.lock';

/** Session valve inside {@link CONFIG_DIR}. Untracked — overrides the baseline. */
export const RUNTIME_FILE = 'runtime.json';

/**
 * Name an earlier seiri version left in {@link CONFIG_DIR}, kept so the
 * generated `.seiri/.gitignore` keeps ignoring it. Never read or written.
 */
const SIGNALS_FILE = 'session-signals.json';

/**
 * Lock directory name an earlier seiri version left in {@link CONFIG_DIR},
 * kept so the generated `.seiri/.gitignore` keeps ignoring it. Never read
 * or written.
 */
const SIGNALS_LOCK_DIR = 'session-signals.lock';

/** Actor-scoped, ignored workflow metadata. */
export const SESSIONS_DIR = 'sessions';

/** Ignore file that keeps {@link UNTRACKED_CONFIG_FILES} out of commits. */
export const IGNORE_FILE = '.gitignore';

/**
 * Members of {@link CONFIG_DIR} that must never reach a commit.
 *
 * The runtime valve, retired signal-file names, and session/task
 * directories are session state or resumable local state; none belong in
 * a commit. `.seiri/.gitignore` lists every member and travels with the
 * directory rather than editing the root ignore file.
 */
export const UNTRACKED_CONFIG_FILES = [
  RUNTIME_FILE,
  SIGNALS_FILE,
  SIGNALS_LOCK_DIR,
  `${SESSIONS_DIR}/`,
  `${TASKS_DIR}/`,
] as const;

/** Harness-owned directory that auto-loads instruction files. */
export const CLAUDE_DIR = '.claude';

/** Rule doc directory inside {@link CLAUDE_DIR}. */
export const RULES_DIR = 'rules';

/** Plugin-shipped rule templates, relative to the plugin root. */
export const TEMPLATES_DIR = 'templates';

/** Manifest file inside `<pluginRoot>/<TEMPLATES_DIR>/<RULES_DIR>/`. */
export const MANIFEST_FILE = 'manifest.json';

/** Marker that ends a walk-up search for the repository root. */
export const GIT_DIR = '.git';

/** Built browser assets, shipped beside the plugin and read at runtime. */
export const PUBLIC_DIR = 'public';

/** Settings page inside {@link PUBLIC_DIR}. */
export const SETTINGS_HTML = 'settings.html';

/** Instruction-load observations, inside the plugin cache directory. */
export const OBSERVATION_LOG = 'instructions-loaded.jsonl';
