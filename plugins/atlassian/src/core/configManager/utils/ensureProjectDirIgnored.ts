import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const IGNORE_HEADER = "# Atlassian site identifiers — not for commits.";
const IGNORED_FILES = ["config.json", "credentials.json"];

/**
 * Create the project config directory with an ignore file the first time.
 *
 * The config holds a base URL and an account email — identifiers worth keeping
 * out of a repository even when they are not secrets. The ignore file lives
 * inside `.atlassian/` rather than in the repository's root `.gitignore` so
 * that pointing one project at another site never edits a file the team owns.
 * `credentials.json` is listed too: it is user-only today, and the line costs
 * nothing while making a future mistake visible.
 *
 * An existing ignore file is left exactly as found — a project that wrote its
 * own rules there meant them.
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
