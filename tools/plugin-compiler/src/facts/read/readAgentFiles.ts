import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENTS_DIRECTORY } from "../../constants/claudeArtifacts.js";

/**
 * Read every `agents/*.md` file as `basename → content`. Returns `{}` when the
 * plugin has no `agents/` dir. The Codex skill-variant builder relocates these
 * into each variant's `_shared/personas/` so a relocated skill reaches its
 * persona by a robust skill-relative path instead of the fragile plugin-root
 * `agents/` climb.
 */
export function readAgentFiles(
  pluginDirectory: string,
): Record<string, string> {
  const agentsRoot = join(pluginDirectory, AGENTS_DIRECTORY);
  if (!existsSync(agentsRoot)) return {};
  const files: Record<string, string> = {};
  for (const entry of readdirSync(agentsRoot, { withFileTypes: true }))
    if (entry.isFile() && entry.name.endsWith(".md"))
      files[entry.name] = readFileSync(join(agentsRoot, entry.name), "utf8");
  return files;
}
