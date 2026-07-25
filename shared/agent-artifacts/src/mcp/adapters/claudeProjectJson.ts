import type {
  McpServerManager,
  McpServerManagerOptions,
} from "../../types/mcp.js";
import { applyClaudeProjectJson } from "./applyClaudeProjectJson.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";
import { inspectClaudeProjectJson } from "./inspectClaudeProjectJson.js";
import { planClaudeProjectJson } from "./planClaudeProjectJson.js";

export function claudeProjectJson(
  options: McpServerManagerOptions,
): McpServerManager {
  const context: FileMcpAdapterContext = {
    owner: options.owner,
    target: options.target as FileMcpAdapterContext["target"],
  };
  return {
    inspect: inspectClaudeProjectJson.bind(undefined, context),
    plan: planClaudeProjectJson.bind(undefined, context),
    apply: applyClaudeProjectJson.bind(undefined, context),
  };
}
