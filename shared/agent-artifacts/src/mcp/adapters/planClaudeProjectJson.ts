import { readUtf8FileIfExistsSync } from "@ogham/cross-platform/filesystem";

import type { McpServerPlan, McpServerRequest } from "../../types/mcp.js";
import { createRevision } from "../../transactions/index.js";
import { canonicalMcpValue } from "../planning/canonicalMcpValue.js";
import { decideMcpAction } from "../planning/decideMcpAction.js";
import { validateMcpRequest } from "../planning/validateMcpRequest.js";
import { toClaudeProjectDefinition } from "../encoding/toClaudeProjectDefinition.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";
import { parseClaudeProjectJson } from "./parseClaudeProjectJson.js";

export async function planClaudeProjectJson(
  context: FileMcpAdapterContext,
  request: McpServerRequest,
): Promise<McpServerPlan> {
  const revision = createRevision([context.target.path]);
  const revisions = [{ target: context.target.path, revision }];
  const requestError = validateMcpRequest(request, "claude-project");
  if (requestError !== null)
    return {
      request,
      outcomes: [
        {
          id: request.name,
          action: "conflict",
          target: context.target.path,
          reason: requestError,
        },
      ],
      revisions,
      failure: { kind: "invalid", reason: requestError },
    };

  const parsed = parseClaudeProjectJson(
    readUtf8FileIfExistsSync(context.target.path),
  );
  if (!parsed.ok)
    return {
      request,
      outcomes: [
        {
          id: request.name,
          action: "conflict",
          target: context.target.path,
          reason: parsed.reason,
        },
      ],
      revisions,
      failure: { kind: "invalid", reason: parsed.reason },
    };

  const hasExisting = Object.prototype.hasOwnProperty.call(
    parsed.value.servers,
    request.name,
  );
  const existing = hasExisting ? parsed.value.servers[request.name] : undefined;
  const desired =
    request.definition === null
      ? null
      : toClaudeProjectDefinition(request.definition);
  const observed = !hasExisting
    ? "missing"
    : desired !== null &&
        canonicalMcpValue(existing) === canonicalMcpValue(desired)
      ? "matching"
      : "drift";
  const action = decideMcpAction({
    observed,
    desired: desired !== null,
    replaceDrift: request.replaceDrift,
  });
  return {
    request,
    outcomes: [
      {
        id: request.name,
        action,
        target: context.target.path,
      },
    ],
    revisions,
  };
}
