import type {
  McpApplyOptions,
  McpServerApplyResult,
  McpServerPlan,
} from "../../types/mcp.js";
import { validateMcpRequest } from "../planning/validateMcpRequest.js";
import type { CliMcpAdapterContext } from "./adapterTypes.js";
import { defaultMcpCliRunner } from "./defaultMcpCliRunner.js";
import { toMcpCliFailure } from "./toMcpCliFailure.js";

export async function applyCliMcpServer(
  context: CliMcpAdapterContext,
  plan: McpServerPlan,
  options?: McpApplyOptions,
): Promise<McpServerApplyResult> {
  if (plan.failure !== undefined)
    return {
      ok: false,
      outcomes: plan.outcomes,
      revisions: plan.revisions,
      failure: { kind: plan.failure.kind, code: null, stderr: "" },
    };

  const validationError = validateMcpRequest(
    plan.request,
    context.target.command === "claude" ? "claude-user" : "codex-user",
  );
  if (validationError !== null)
    return {
      ok: false,
      outcomes: plan.outcomes.map((outcome) => ({
        ...outcome,
        action: "conflict",
        reason: validationError,
      })),
      revisions: plan.revisions,
      failure: { kind: "invalid", code: null, stderr: "" },
    };

  try {
    const result = await (options?.runner ?? defaultMcpCliRunner)(
      context.target.command,
      context.buildArguments(plan.request),
    );
    const failure = toMcpCliFailure(result);
    return failure === null
      ? {
          ok: true,
          outcomes: plan.outcomes,
          revisions: plan.revisions,
        }
      : {
          ok: false,
          outcomes: plan.outcomes,
          revisions: plan.revisions,
          failure,
        };
  } catch (error) {
    return {
      ok: false,
      outcomes: plan.outcomes,
      revisions: plan.revisions,
      failure: {
        kind: "spawn",
        code: null,
        stderr: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
