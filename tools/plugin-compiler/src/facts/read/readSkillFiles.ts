import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SKILLS_DIRECTORY } from "../../constants/claudeArtifacts.js";

/**
 * Read every file under `skills/` recursively as `posixRelativePath → content`.
 * Returns `{}` when the plugin has no `skills/` dir. Keys are always `/`-joined
 * (never `path.join`, which is `\` on Windows) so the emitted Codex skill-variant
 * tree is byte-identical across platforms. A manual walk keeps the reader
 * portable (no Node `readdirSync({recursive})` version floor) and yields files
 * only — the whole tree is needed because Codex skill discovery is REPLACE.
 */
export function readSkillFiles(
  pluginDirectory: string,
): Record<string, string> {
  const skillsRoot = join(pluginDirectory, SKILLS_DIRECTORY);
  if (!existsSync(skillsRoot)) return {};
  const files: Record<string, string> = {};
  walk(skillsRoot, "");
  return files;

  function walk(directory: string, prefix: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const childPath = join(directory, entry.name);
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(childPath, key);
      else if (entry.isFile()) files[key] = readFileSync(childPath, "utf8");
    }
  }
}
