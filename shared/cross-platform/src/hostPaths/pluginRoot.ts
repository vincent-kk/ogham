import { detectHost } from "./detectHost.js";

/**
 * The plugin's own install directory — where bundled assets ship (settings HTML,
 * the R execution contract, `bridge/`, rule-doc templates).
 *
 * `CLAUDE_PLUGIN_ROOT` is checked first on every host, not just Claude: Codex
 * injects it into hook processes too, and there it is the only correct answer
 * (a hook's cwd is the session directory).
 *
 * The Codex fallback rests on a non-obvious coupling. The adapter cannot know the
 * install path at generation time, so the MCP `args` are relative and the
 * declaration pins `"cwd": "."`. Without that, node dies with module-not-found
 * before serving a single tool — so a *running* Codex MCP server is itself the
 * proof that its cwd is the plugin root.
 *
 * `agy` has no `cwd` field in `mcp_config.json`, so that coupling is unavailable
 * and its plugin root is still unmeasured — null until it is.
 */
export function pluginRoot(): string | null {
  const fromEnv = process.env.CLAUDE_PLUGIN_ROOT;
  if (fromEnv) return fromEnv;
  return detectHost() === "codex" ? process.cwd() : null;
}
