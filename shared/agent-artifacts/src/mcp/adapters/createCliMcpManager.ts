import type { McpServerManager } from "../../types/mcp.js";
import type {
  CliMcpAdapterContext,
  McpCliArgumentBuilder,
} from "./adapterTypes.js";
import { applyCliMcpServer } from "./applyCliMcpServer.js";
import { inspectCliMcpServer } from "./inspectCliMcpServer.js";
import { planCliMcpServer } from "./planCliMcpServer.js";

export function createCliMcpManager(options: {
  readonly owner: string;
  readonly target: CliMcpAdapterContext["target"];
  readonly buildArguments: McpCliArgumentBuilder;
}): McpServerManager {
  const context: CliMcpAdapterContext = options;
  return {
    inspect: inspectCliMcpServer.bind(undefined, context),
    plan: planCliMcpServer.bind(undefined, context),
    apply: applyCliMcpServer.bind(undefined, context),
  };
}
