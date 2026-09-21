import {
  pluginCache,
  portableResolve,
  resolveContainedPath,
} from '@ogham/cross-platform';

import type { McpToolName } from '../../../../constants/mcpToolNames.js';
import {
  TOOL_ARTIFACT_DIRECTORY,
  TOOL_ARTIFACT_PLUGIN_NAME,
} from '../../../../constants/toolEnvelope.js';

/**
 * The directory a tool's persisted artifacts are written to.
 * @param toolName Tool whose artifacts the directory holds.
 * @returns Absolute path under the plugin cache; it may not exist yet.
 */
export function resolveToolArtifactDirectory(toolName: McpToolName): string {
  return resolveContainedPath(
    portableResolve(pluginCache(TOOL_ARTIFACT_PLUGIN_NAME)),
    TOOL_ARTIFACT_DIRECTORY,
    toolName,
  );
}
