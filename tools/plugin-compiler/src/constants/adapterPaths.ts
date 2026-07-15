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

/**
 * agy discovers a hooks file by convention at the plugin root, in its own
 * named-group format. Claude auto-discovers `hooks/hooks.json` (subdirectory)
 * and Codex reads it via the manifest's `hooks` field, so neither consults this
 * root file — the three hosts stay isolated. Measured safe: Codex ignores a
 * root `hooks.json` when the manifest declares `hooks/hooks.json` (stage5).
 */
export const AGY_HOOKS_PATH = "hooks.json";

/**
 * The agy hook runner each plugin bundles to `bridge/run-agy.mjs`
 * (@ogham/cross-platform agyRunner main). The emitted agy `hooks.json` routes
 * every event through it because agy cannot parse Claude-format hooks. Kept in
 * sync with the plugins' `scripts/build-hooks.mjs` output name by this contract.
 */
export const AGY_RUNNER_BRIDGE = "bridge/run-agy.mjs";
