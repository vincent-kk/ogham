import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CLAUDE_MANIFEST_PATH } from "../../constants/hosts.js";

/** Lists plugin directories (those carrying a Claude manifest), sorted. */
export function listPluginDirectories(rootDirectory: string): string[] {
  const pluginsRoot = join(rootDirectory, "plugins");
  return readdirSync(pluginsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(pluginsRoot, entry.name))
    .filter((directory) => existsSync(join(directory, CLAUDE_MANIFEST_PATH)))
    .sort();
}
