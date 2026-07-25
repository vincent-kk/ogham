import type { HookOutput } from '../types/hooks';

/**
 * Package identity. Used for the plugin cache directory, the error-log
 * scope, and the MCP server name — three places that must agree, because
 * a mismatch scatters one plugin's state across two directories.
 */
export const PLUGIN_NAME = 'seiri';

/**
 * Prefix carried by every rule id and rule filename.
 *
 * `.claude/rules/` is shared with every other installed plugin, so the
 * namespace is what keeps two plugins from claiming the same filename.
 */
export const RULE_ID_PREFIX = `${PLUGIN_NAME}_`;

/** Marker opening every line seiri injects into a session. */
export const INJECTION_PREFIX = `[${PLUGIN_NAME}]`;

/**
 * Namespace on every skill reference — `seiri:write-plan` as the model
 * dispatches it, `/seiri:write-plan` as prose names it. What arrives in a
 * hook payload is the first form, which is why this carries no slash.
 */
export const SKILL_ID_PREFIX = `${PLUGIN_NAME}:`;

export const EMPTY_RESULT = { continue: true } as const satisfies HookOutput;
