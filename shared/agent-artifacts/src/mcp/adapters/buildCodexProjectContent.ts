import type { McpServerRequest } from "../../types/mcp.js";
import { codexMcpBlockMarkers } from "../encoding/codexMcpBlockMarkers.js";
import { findCodexMcpBlock } from "../encoding/findCodexMcpBlock.js";
import { mergeCodexMcpBlock } from "../encoding/mergeCodexMcpBlock.js";
import { renderCodexMcpBlock } from "../encoding/renderCodexMcpBlock.js";
import type {
  FileMcpAdapterContext,
  McpFileContentResult,
} from "./adapterTypes.js";
import { parseCodexProjectToml } from "./parseCodexProjectToml.js";

export function buildCodexProjectContent(options: {
  readonly context: FileMcpAdapterContext;
  readonly request: McpServerRequest;
  readonly source: string;
}): McpFileContentResult {
  const markers = codexMcpBlockMarkers(
    options.context.owner,
    options.request.name,
  );
  const block = findCodexMcpBlock(options.source, markers);
  if (!block.ok) return block;
  const content = mergeCodexMcpBlock({
    source: options.source,
    block,
    replacement:
      options.request.definition === null
        ? null
        : renderCodexMcpBlock({
            markers,
            name: options.request.name,
            definition: options.request.definition,
          }),
  });
  const validated = parseCodexProjectToml(content);
  return validated.ok ? { ok: true, content } : validated;
}
