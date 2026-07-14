/**
 * Plugin-root manifest. Shared by two hosts on purpose:
 * - agy requires it as the plugin marker; without it agy imports the plugin as a
 *   Claude plugin and regenerates `mcp_config.json` from `.mcp.json`, wiping the
 *   `OGHAM_HOST` marker.
 * - Codex also discovers this path and it SHADOWS `.codex-plugin/plugin.json`, so
 *   the content must be the full Codex manifest. A bare `{"name": …}` marker kills
 *   Codex MCP outright (measured on codex-cli 0.144.4).
 */
export const ROOT_MANIFEST_PATH = "plugin.json";

export const CODEX_MANIFEST_PATH = ".codex-plugin/plugin.json";
export const AGY_MCP_CONFIG_PATH = "mcp_config.json";
export const CODEX_MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
