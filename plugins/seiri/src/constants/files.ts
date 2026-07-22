/** Project-local directory holding seiri's own configuration. */
export const CONFIG_DIR = '.seiri';

/** Configuration file inside {@link CONFIG_DIR}. */
export const CONFIG_FILE = 'config.json';

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
