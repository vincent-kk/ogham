import type { PluginFacts } from "../../../types/index.js";
import { collectMcpHookTokens } from "./collectMcpHookTokens.js";
import { createMcpServerPrefixes } from "./createMcpServerPrefixes.js";
import { McpToolReferenceError } from "../mcpToolReferenceError.js";
import { MCP_TOOL_TOKEN } from "./patterns.js";
import { readMcpToolMarker } from "./readMcpToolMarker.js";
import { resolveMcpToolName } from "./resolveMcpToolName.js";

/** Validated file opt-in and its complete owned callable-address mapping. */
export interface McpToolReferences {
  /** Only these relative skill paths may have their MCP references rewritten. */
  skillPaths: string[];
  /** Canonical token to Codex callable token, shared with exact hook alternatives. */
  names: Record<string, string>;
}

/**
 * Validate plugin opt-in before any builder emits a partial variant.
 * @param facts Canonical skill, hook and server facts; inputs remain unchanged.
 * @returns Selected file paths and complete mappings, or null without opt-in.
 * @throws McpToolReferenceError for invalid markers, names, matchers or collisions.
 */
export function prepareMcpToolReferences(
  facts: PluginFacts,
): McpToolReferences | null {
  const marked = Object.entries(facts.skillFiles).filter(([path, content]) =>
    readMcpToolMarker(content, path, facts.name),
  );
  if (marked.length === 0) return null;
  const prefixes = createMcpServerPrefixes(facts);
  const tokens = marked.flatMap(
    ([, content]) => content.match(MCP_TOOL_TOKEN) ?? [],
  );
  tokens.push(...collectMcpHookTokens(facts));
  const names: Record<string, string> = {};
  for (const token of tokens) {
    if (!token.startsWith(`mcp__plugin_${facts.name}_`)) continue;
    const target = resolveMcpToolName(token, prefixes);
    if (
      Object.entries(names).some(
        ([source, name]) => name === target && source !== token,
      )
    )
      throw new McpToolReferenceError(
        `MCP tool references collide at ${target}`,
      );
    names[token] = target;
  }
  return { skillPaths: marked.map(([path]) => path), names };
}
