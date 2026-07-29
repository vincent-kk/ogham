import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const IGNORE_HEADER = "# Entrez contact details — not for commits.";
const IGNORED_FILES = ["config.json", "credentials.json"];

/**
 * Create the project config directory with an ignore file the first time.
 *
 * The config holds a contact email, which NCBI requires and which nobody
 * intends to publish. The ignore file lives inside `.entrez/` rather than in
 * the repository's root `.gitignore` so that configuring one project never
 * edits a file the team owns. `credentials.json` is listed too: the api_key
 * is user-only today, and the line costs nothing while making a future
 * mistake visible.
 *
 * An existing ignore file is left exactly as found.
 */
export function ensureProjectDirIgnored(projectConfigPath: string): void {
  const directory = dirname(projectConfigPath);
  mkdirSync(directory, { recursive: true });

  const ignorePath = join(directory, ".gitignore");
  if (existsSync(ignorePath)) return;
  writeFileSync(
    ignorePath,
    `${[IGNORE_HEADER, ...IGNORED_FILES].join("\n")}\n`,
    "utf8",
  );
}
