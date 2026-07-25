import { readUtf8FileIfExistsSync } from "@ogham/cross-platform/filesystem";

import type {
  McpApplyOptions,
  McpServerApplyResult,
  McpServerPlan,
} from "../../types/mcp.js";
import { createRevision } from "../../transactions/index.js";
import { validateMcpRequest } from "../planning/validateMcpRequest.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";
import { applyMcpFileContent } from "./applyMcpFileContent.js";
import { parseClaudeProjectJson } from "./parseClaudeProjectJson.js";
import { renderClaudeProjectJson } from "./renderClaudeProjectJson.js";

export async function applyClaudeProjectJson(
  context: FileMcpAdapterContext,
  plan: McpServerPlan,
  _options?: McpApplyOptions,
): Promise<McpServerApplyResult> {
  if (plan.failure !== undefined)
    return {
      ok: false,
      outcomes: plan.outcomes,
      revisions: plan.revisions,
      failure: { kind: plan.failure.kind, code: null, stderr: "" },
    };

  const validationError = validateMcpRequest(plan.request, "claude-project");
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

  const expectedRevision = plan.revisions.find(
    (entry) => entry.target === context.target.path,
  )?.revision;
  if (expectedRevision !== createRevision([context.target.path]))
    return {
      ok: false,
      outcomes: plan.outcomes.map((outcome) => ({
        ...outcome,
        action: "conflict",
        reason: "MCP target revision changed",
      })),
      revisions: plan.revisions,
      failure: { kind: "conflict", code: null, stderr: "" },
    };

  const source = readUtf8FileIfExistsSync(context.target.path);
  const parsed = parseClaudeProjectJson(source);
  if (!parsed.ok)
    return {
      ok: false,
      outcomes: plan.outcomes,
      revisions: plan.revisions,
      failure: { kind: "invalid", code: null, stderr: "" },
    };

  const action = plan.outcomes[0]?.action;
  return applyMcpFileContent({
    context,
    plan,
    content:
      action === "copy" || action === "update" || action === "remove"
        ? renderClaudeProjectJson(parsed.value, plan.request)
        : (source ?? ""),
    write: action === "copy" || action === "update" || action === "remove",
  });
}
