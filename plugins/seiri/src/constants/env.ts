/**
 * Host-provided plugin install directory. Present in hook processes on
 * every supported host, which is why hooks read it directly instead of
 * going through the MCP-only host-paths resolver.
 */
export const ENV_PLUGIN_ROOT = 'CLAUDE_PLUGIN_ROOT';
