/**
 * Host-provided plugin install directory. Present in hook processes on
 * every supported host, which is why hooks read it directly instead of
 * going through the MCP-only host-paths resolver.
 */
export const ENV_PLUGIN_ROOT = 'CLAUDE_PLUGIN_ROOT';

/** Set to {@link ENV_FLAG_ON} to suppress the settings tab (e2e, headless). */
export const ENV_NO_BROWSER = 'SEIRI_NO_BROWSER';

/** The only value the flags above treat as enabled. */
export const ENV_FLAG_ON = '1';
