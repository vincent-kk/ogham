/** Project-local directory holding seiri's own configuration. */
export const CONFIG_DIR = '.seiri';

/** Configuration file inside {@link CONFIG_DIR}. Committed — the baseline. */
export const CONFIG_FILE = 'config.json';

/** Session valve inside {@link CONFIG_DIR}. Untracked — overrides the baseline. */
export const RUNTIME_FILE = 'runtime.json';

/** Failure-chain counters inside {@link CONFIG_DIR}. Untracked, session-scoped. */
export const SIGNALS_FILE = 'session-signals.json';

/** Ignore file that keeps {@link UNTRACKED_CONFIG_FILES} out of commits. */
export const IGNORE_FILE = '.gitignore';

/**
 * Members of {@link CONFIG_DIR} that must never reach a commit.
 *
 * Both are session state: a dial someone lowered for one afternoon, and
 * counters that mean nothing outside the session that wrote them. Letting
 * either ride along in a commit would erode the team's declared baseline,
 * so `.seiri/.gitignore` lists them and travels with the directory rather
 * than editing the repository's root ignore file.
 */
export const UNTRACKED_CONFIG_FILES = [RUNTIME_FILE, SIGNALS_FILE] as const;

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
