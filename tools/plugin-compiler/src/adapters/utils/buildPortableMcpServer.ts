import {
  CLAUDE_PLUGIN_ROOT_VARIABLE,
  HOST_MARKER_ENV_NAME,
} from "../../constants/hosts.js";
import type { McpServerSource } from "../../types/adapter.js";
import { relativizePluginRootPath } from "./relativizePluginRootPath.js";

/**
 * Rewrites one Claude `.mcp.json` server for hosts that neither expand
 * `${CLAUDE_PLUGIN_ROOT}` nor run servers in the session cwd: args become
 * plugin-root-relative and the host marker env identifies the host at runtime.
 */
export function buildPortableMcpServer(
  source: McpServerSource,
  hostMarker: string,
): McpServerSource {
  if (source.command.includes(CLAUDE_PLUGIN_ROOT_VARIABLE))
    throw new Error(
      `command must not use \${CLAUDE_PLUGIN_ROOT} (unexpanded on codex/agy): ${source.command}`,
    );
  for (const value of Object.values(source.env ?? {}))
    if (value.includes(CLAUDE_PLUGIN_ROOT_VARIABLE))
      throw new Error(
        `env values must not use \${CLAUDE_PLUGIN_ROOT} (unexpanded on codex/agy): ${value}`,
      );

  return {
    command: source.command,
    args: source.args.map(relativizePluginRootPath),
    env: { ...source.env, [HOST_MARKER_ENV_NAME]: hostMarker },
  };
}
