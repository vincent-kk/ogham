import { readUtf8FileIfExistsSync } from "@ogham/cross-platform/filesystem";

import type { McpServerPlan, McpServerRequest } from "../../types/mcp.js";
import { createRevision } from "../../transactions/index.js";
import { decideMcpAction } from "../planning/decideMcpAction.js";
import { validateMcpRequest } from "../planning/validateMcpRequest.js";
import { codexMcpBlockMarkers } from "../encoding/codexMcpBlockMarkers.js";
import { findCodexMcpBlock } from "../encoding/findCodexMcpBlock.js";
import { toCodexProjectDefinition } from "../encoding/toCodexProjectDefinition.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";
import { codexMcpObservedState } from "./codexMcpObservedState.js";
import { codexMcpOwnershipFailure } from "./codexMcpOwnershipFailure.js";
import { createCodexProjectFailurePlan } from "./createCodexProjectFailurePlan.js";
import { parseCodexProjectToml } from "./parseCodexProjectToml.js";
import { toCodexMcpRegistry } from "./toCodexMcpRegistry.js";
import { validateCodexProjectCandidate } from "./validateCodexProjectCandidate.js";

export async function planCodexProjectToml(
  context: FileMcpAdapterContext,
  request: McpServerRequest,
): Promise<McpServerPlan> {
  const revision = createRevision([context.target.path]);
  const revisions = [{ target: context.target.path, revision }];
  const requestError = validateMcpRequest(request, "codex-project");
  if (requestError !== null)
    return createCodexProjectFailurePlan(
      request,
      context.target.path,
      revisions,
      "invalid",
      requestError,
    );

  const source = readUtf8FileIfExistsSync(context.target.path) ?? "";
  const parsed = parseCodexProjectToml(source);
  if (!parsed.ok)
    return createCodexProjectFailurePlan(
      request,
      context.target.path,
      revisions,
      "invalid",
      parsed.reason,
    );

  const block = findCodexMcpBlock(
    source,
    codexMcpBlockMarkers(context.owner, request.name),
  );
  if (!block.ok)
    return createCodexProjectFailurePlan(
      request,
      context.target.path,
      revisions,
      "invalid",
      block.reason,
    );

  const registry = toCodexMcpRegistry(parsed.value.mcp_servers);
  const hasExisting = Object.prototype.hasOwnProperty.call(
    registry,
    request.name,
  );
  const ownershipFailure = codexMcpOwnershipFailure(
    hasExisting,
    block.range !== null,
  );
  if (ownershipFailure !== null)
    return createCodexProjectFailurePlan(
      request,
      context.target.path,
      revisions,
      ownershipFailure.kind,
      ownershipFailure.reason,
    );

  const desired =
    request.definition === null
      ? null
      : toCodexProjectDefinition(request.definition);
  const observed = codexMcpObservedState(
    hasExisting,
    registry[request.name],
    desired,
  );
  const action = decideMcpAction({
    observed,
    desired: desired !== null,
    replaceDrift: request.replaceDrift,
  });
  const candidateError = validateCodexProjectCandidate(
    context,
    request,
    source,
    action,
  );
  if (candidateError !== null)
    return createCodexProjectFailurePlan(
      request,
      context.target.path,
      revisions,
      "invalid",
      candidateError,
    );
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
