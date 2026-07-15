import { CODEX_HOOKS_PATH } from "../../constants/adapterPaths.js";
import {
  CLAUDE_HOOKS_PATH,
  SKILLS_DIRECTORY,
} from "../../constants/claudeArtifacts.js";
import type { PluginFacts } from "../../types/index.js";
import { buildCodexHooks } from "./buildCodexHooks.js";
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

export function buildCodexPluginManifest(
  facts: PluginFacts,
): Record<string, unknown> {
  const manifest: Record<string, unknown> = {};
  for (const field of COPIED_MANIFEST_FIELDS)
    if (facts.manifest[field] !== undefined)
      manifest[field] = facts.manifest[field];

  if (facts.hasSkills) manifest.skills = `./${SKILLS_DIRECTORY}/`;
  // Point Codex at its own Bash-extended hooks copy when one is emitted (a
  // read-catching matcher), else the shared Claude file. buildCodexHooks is the
  // single source of that decision — the pipeline emits the file on the same test.
  if (facts.hasHooks)
    manifest.hooks = `./${buildCodexHooks(facts) ? CODEX_HOOKS_PATH : CLAUDE_HOOKS_PATH}`;

  const mcpServers = buildCodexMcpServers(facts);
  if (mcpServers) manifest.mcpServers = mcpServers;
  return manifest;
}
