import type { McpPlanFailure } from "../../types/mcp.js";

export function codexMcpOwnershipFailure(
  hasExisting: boolean,
  hasOwnedBlock: boolean,
): McpPlanFailure | null {
  if (hasExisting && !hasOwnedBlock)
    return {
      kind: "conflict",
      reason: "same-name MCP server is unowned",
    };
  if (!hasExisting && hasOwnedBlock)
    return {
      kind: "invalid",
      reason: "owned MCP block does not define the selected server",
    };
  return null;
}
