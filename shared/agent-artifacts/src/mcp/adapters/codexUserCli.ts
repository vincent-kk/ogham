import type {
  McpServerManager,
  McpServerManagerOptions,
} from "../../types/mcp.js";
import type { CliMcpAdapterContext } from "./adapterTypes.js";
import { buildCodexUserArguments } from "./buildCodexUserArguments.js";
import { createCliMcpManager } from "./createCliMcpManager.js";

export function codexUserCli(
  options: McpServerManagerOptions,
): McpServerManager {
  return createCliMcpManager({
    owner: options.owner,
    target: options.target as CliMcpAdapterContext["target"],
    buildArguments: buildCodexUserArguments,
  });
}
