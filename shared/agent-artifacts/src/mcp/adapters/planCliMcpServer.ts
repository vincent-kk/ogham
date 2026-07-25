import type { McpServerPlan, McpServerRequest } from "../../types/mcp.js";
import { validateMcpRequest } from "../planning/validateMcpRequest.js";
import type { CliMcpAdapterContext } from "./adapterTypes.js";

export async function planCliMcpServer(
  context: CliMcpAdapterContext,
  request: McpServerRequest,
): Promise<McpServerPlan> {
  const error = validateMcpRequest(
    request,
    context.target.command === "claude" ? "claude-user" : "codex-user",
  );
  if (error !== null)
    return {
      request,
      outcomes: [
        {
          id: request.name,
          action: "conflict",
          target: `${context.target.command} mcp`,
          reason: error,
        },
      ],
      revisions: [],
      failure: { kind: "invalid", reason: error },
    };

  return {
    request,
    outcomes: [
      {
        id: request.name,
        action: request.definition === null ? "remove" : "copy",
        target: `${context.target.command} mcp`,
      },
    ],
    revisions: [],
  };
}
