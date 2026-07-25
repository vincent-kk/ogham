import type { ArtifactOutcome } from "../../types/artifacts.js";
import { validateMcpRequest } from "../planning/validateMcpRequest.js";
import type { CliMcpAdapterContext } from "./adapterTypes.js";

export async function inspectCliMcpServer(
  context: CliMcpAdapterContext,
  name: string,
): Promise<readonly ArtifactOutcome[]> {
  const error = validateMcpRequest(
    { name, definition: null, replaceDrift: false },
    context.target.command === "claude" ? "claude-user" : "codex-user",
  );
  return [
    {
      id: name,
      action: error === null ? "unsupported" : "conflict",
      target: `${context.target.command} mcp`,
      reason: error ?? "CLI registry inspection is intentionally not spawned",
    },
  ];
}
