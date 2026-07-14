import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CLAUDE_MANIFEST_PATH,
  PLUGINS_DIRECTORY,
} from "../../constants/claudeArtifacts.js";

export function listPluginDirectories(rootDirectory: string): string[] {
  const pluginsRoot = join(rootDirectory, PLUGINS_DIRECTORY);
  return readdirSync(pluginsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(pluginsRoot, entry.name))
    .filter((directory) => existsSync(join(directory, CLAUDE_MANIFEST_PATH)))
    .sort();
}
