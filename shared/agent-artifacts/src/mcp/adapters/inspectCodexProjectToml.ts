import { readUtf8FileIfExistsSync } from "@ogham/cross-platform/filesystem";

import type { ArtifactOutcome } from "../../types/artifacts.js";
import { codexMcpBlockMarkers } from "../encoding/codexMcpBlockMarkers.js";
import { findCodexMcpBlock } from "../encoding/findCodexMcpBlock.js";
import { validateMcpRequest } from "../planning/validateMcpRequest.js";
import type { FileMcpAdapterContext } from "./adapterTypes.js";
import { parseCodexProjectToml } from "./parseCodexProjectToml.js";

export async function inspectCodexProjectToml(
  context: FileMcpAdapterContext,
  name: string,
): Promise<readonly ArtifactOutcome[]> {
  const nameError = validateMcpRequest(
    { name, definition: null, replaceDrift: false },
    "codex-project",
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

  const source = readUtf8FileIfExistsSync(context.target.path) ?? "";
  const parsed = parseCodexProjectToml(source);
  const block = findCodexMcpBlock(
    source,
    codexMcpBlockMarkers(context.owner, name),
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

  if (!block.ok)
    return [
      {
        id: name,
        action: "conflict",
        target: context.target.path,
        reason: block.reason,
      },
    ];

  const rawRegistry = parsed.value.mcp_servers;
  const registry =
    rawRegistry !== null &&
    typeof rawRegistry === "object" &&
    !Array.isArray(rawRegistry)
      ? (rawRegistry as Readonly<Record<string, unknown>>)
      : {};
  const exists = Object.prototype.hasOwnProperty.call(registry, name);
  if (exists && block.range === null)
    return [
      {
        id: name,
        action: "conflict",
        target: context.target.path,
        reason: "same-name MCP server is unowned",
      },
    ];

  return [
    {
      id: name,
      action: exists ? "unchanged" : "skip",
      target: context.target.path,
      ...(block.range !== null && !exists
        ? { reason: "owned MCP block does not define the selected server" }
        : {}),
    },
  ];
}
