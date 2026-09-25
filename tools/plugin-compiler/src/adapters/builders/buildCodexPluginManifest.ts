import {
  CODEX_HOOKS_PATH,
  CODEX_SKILLS_DIR,
} from "../../constants/adapterPaths.js";
import {
  CLAUDE_HOOKS_PATH,
  SKILLS_DIRECTORY,
} from "../../constants/claudeArtifacts.js";
import type { PluginFacts } from "../../types/index.js";
import { buildCodexHooks } from "./buildCodexHooks.js";
import { buildCodexMcpServers } from "./buildCodexMcpServers.js";
import { emitsCodexSkillVariant } from "./buildCodexSkills.js";

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

export function buildCodexPluginManifest(
  facts: PluginFacts,
): Record<string, unknown> {
  const manifest: Record<string, unknown> = {};
  for (const field of COPIED_MANIFEST_FIELDS)
    if (facts.manifest[field] !== undefined)
      manifest[field] = facts.manifest[field];

  // The pipeline shares this predicate, so the manifest selects the complete
  // generated tree whenever persona, lifecycle or MCP adaptation requires one.
  if (facts.hasSkills)
    manifest.skills = `./${emitsCodexSkillVariant(facts) ? CODEX_SKILLS_DIR : SKILLS_DIRECTORY}/`;
  // The pipeline shares this builder, so filtering, fallbacks and exact MCP
  // adaptation select the same dedicated hooks file as the manifest.
  if (facts.hasHooks)
    manifest.hooks = `./${buildCodexHooks(facts) ? CODEX_HOOKS_PATH : CLAUDE_HOOKS_PATH}`;

  const mcpServers = buildCodexMcpServers(facts);
  if (mcpServers) manifest.mcpServers = mcpServers;
  return manifest;
}
