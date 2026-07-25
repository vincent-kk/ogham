import type { ArtifactAction } from "../../types/artifacts.js";
import type { McpServerRequest } from "../../types/mcp.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";
import { buildCodexProjectContent } from "./buildCodexProjectContent.js";

export function validateCodexProjectCandidate(
  context: FileMcpAdapterContext,
  request: McpServerRequest,
  source: string,
  action: ArtifactAction,
): string | null {
  if (action !== "copy" && action !== "update" && action !== "remove")
    return null;
  const candidate = buildCodexProjectContent({ context, request, source });
  return candidate.ok ? null : candidate.reason;
}
