import type {
  McpServerManager,
  McpServerManagerOptions,
} from "../../types/mcp.js";
import { applyCodexProjectToml } from "./applyCodexProjectToml.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";
import { inspectCodexProjectToml } from "./inspectCodexProjectToml.js";
import { planCodexProjectToml } from "./planCodexProjectToml.js";

export function codexProjectToml(
  options: McpServerManagerOptions,
): McpServerManager {
  const context: FileMcpAdapterContext = {
    owner: options.owner,
    target: options.target as FileMcpAdapterContext["target"],
  };
  return {
    inspect: inspectCodexProjectToml.bind(undefined, context),
    plan: planCodexProjectToml.bind(undefined, context),
    apply: applyCodexProjectToml.bind(undefined, context),
  };
}
