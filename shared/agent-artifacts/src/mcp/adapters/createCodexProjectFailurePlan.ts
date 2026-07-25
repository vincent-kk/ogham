import type {
  McpPlanFailure,
  McpServerPlan,
  McpServerRequest,
} from "../../types/mcp.js";

export function createCodexProjectFailurePlan(
  request: McpServerRequest,
  target: string,
  revisions: McpServerPlan["revisions"],
  kind: McpPlanFailure["kind"],
  reason: string,
): McpServerPlan {
  return {
    request,
    outcomes: [
      {
        id: request.name,
        action: "conflict",
        target,
        reason,
      },
    ],
    revisions,
    failure: { kind, reason },
  };
}
