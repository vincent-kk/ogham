import { readUtf8FileIfExistsSync } from "@ogham/cross-platform/filesystem";

import type { ArtifactOutcome } from "../../types/artifacts.js";
import { validateMcpRequest } from "../planning/validateMcpRequest.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";
import { parseClaudeProjectJson } from "./parseClaudeProjectJson.js";

export async function inspectClaudeProjectJson(
  context: FileMcpAdapterContext,
  name: string,
): Promise<readonly ArtifactOutcome[]> {
  const nameError = validateMcpRequest(
    { name, definition: null, replaceDrift: false },
    "claude-project",
  );
  if (nameError !== null)
    return [
      {
        id: name,
        action: "conflict",
        target: context.target.path,
        reason: nameError,
      },
    ];

  const parsed = parseClaudeProjectJson(
    readUtf8FileIfExistsSync(context.target.path),
  );
  if (!parsed.ok)
    return [
      {
        id: name,
        action: "conflict",
        target: context.target.path,
        reason: parsed.reason,
      },
    ];

  return [
    {
      id: name,
      action: Object.prototype.hasOwnProperty.call(parsed.value.servers, name)
        ? "unchanged"
        : "skip",
      target: context.target.path,
    },
  ];
}
