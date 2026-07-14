import { CLAUDE_HOOKS_PATH } from "../../constants/hosts.js";
import type { PluginFacts } from "../../types/adapter.js";
import { buildCodexMcpServers } from "./buildCodexMcpServers.js";

const COPIED_MANIFEST_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "repository",
  "homepage",
  "license",
  "keywords",
] as const;

/**
 * `.codex-plugin/plugin.json` content. Declaring `mcpServers` inline shields
 * Codex from the Claude-only `.mcp.json` (variable args); `hooks` points at
 * the same file Claude consumes so both hosts share one hook config.
 */
export function buildCodexPluginManifest(
  facts: PluginFacts,
): Record<string, unknown> {
  const manifest: Record<string, unknown> = {};
  for (const field of COPIED_MANIFEST_FIELDS)
    if (facts.manifest[field] !== undefined)
      manifest[field] = facts.manifest[field];

  if (facts.hasSkills) manifest.skills = "./skills/";
  if (facts.hasHooks) manifest.hooks = `./${CLAUDE_HOOKS_PATH}`;

  const mcpServers = buildCodexMcpServers(facts);
  if (mcpServers) manifest.mcpServers = mcpServers;
  return manifest;
}
