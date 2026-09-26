import { CODEX_HOOK_MATCHER_CAPABILITIES } from "../../../constants/hosts.js";
import type { PluginFacts } from "../../../types/index.js";
import { McpToolReferenceError } from "../mcpToolReferenceError.js";

/**
 * Collect owned exact hook alternatives without guessing regex equivalence.
 * @param facts Canonical facts for a plugin with an explicit MCP opt-in.
 * @returns Owned tokens from supported tool-matcher events.
 * @throws McpToolReferenceError when an owned token is in a compound expression.
 */
export function collectMcpHookTokens(facts: PluginFacts): string[] {
  const tokens: string[] = [];
  const owner = `mcp__plugin_${facts.name}_`;
  for (const event of CODEX_HOOK_MATCHER_CAPABILITIES.toolMatcherEvents)
    for (const group of facts.hooksFile?.hooks?.[event] ?? [])
      for (const token of group.matcher?.split("|") ?? []) {
        if (!token.includes(owner)) continue;
        if (!/^mcp__plugin_[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$/.test(token))
          throw new McpToolReferenceError(
            `${facts.name}: ${event} requires exact MCP tool tokens`,
            "codex-mcp-hook-matcher",
          );
        tokens.push(token);
      }
  return tokens;
}
