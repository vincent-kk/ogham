import { CLAUDE_PLUGIN_ROOT_VARIABLE } from "../../constants/claudeArtifacts.js";
import {
  HOST_MARKER_ENV_NAME,
  type HostMarker,
} from "../../constants/hosts.js";
import type { McpServerSource } from "../../types/index.js";
import { relativizePluginRootPath } from "./relativizePluginRootPath.js";

export function buildPortableMcpServer(
  source: McpServerSource,
  hostMarker: HostMarker,
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
