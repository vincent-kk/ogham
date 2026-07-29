import { mkdirSync, readFileSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform/compat';

import {
  CONFIG_DIR,
  IGNORE_FILE,
  UNTRACKED_CONFIG_FILES,
} from '../../constants/files.js';

import { findRepoRoot } from './findRepoRoot.js';
import { writeAtomically } from './writeAtomically.js';

const IGNORE_HEADER = '# Session-scoped seiri state — never committed.';

/**
 * Create `<repoRoot>/.seiri/` alongside the ignore file that keeps its
 * untracked members out of commits, and return the directory.
 *
 * The ignore file lives inside `.seiri/` rather than in the repository's
 * root `.gitignore`, so that turning the dial down for an afternoon never
 * edits a file the team owns.
 *
 * @param projectRoot Any path inside the project; the directory is created
 *   at the repository root the walk-up finds.
 */
export function ensureSeiriDir(projectRoot: string): string {
  const dir = portableJoin(findRepoRoot(projectRoot), CONFIG_DIR);
  mkdirSync(dir, { recursive: true });
  syncIgnoreFile(portableJoin(dir, IGNORE_FILE));
  return dir;
}

/**
 * Write the ignore file, or add to one written by an earlier seiri.
 *
 * Writing once and never revisiting would strand every existing project on
 * the member list of whichever version first ran there: a member added
 * later reaches new projects only, and the untracked file nobody listed
 * turns up in `git status`. Only missing names are appended, so a line
 * added by hand below the header survives.
 *
 * The header is the ownership mark. Without it the file is the project's
 * own, and is left exactly as found.
 */
function syncIgnoreFile(path: string): void {
  const existing = readIfPresent(path);
  if (existing !== undefined && !existing.startsWith(IGNORE_HEADER)) return;
  const lines = existing?.split('\n').filter(Boolean) ?? [IGNORE_HEADER];
  const missing = UNTRACKED_CONFIG_FILES.filter(
    (name) => !lines.includes(name),
  );
  if (existing !== undefined && missing.length === 0) return;
  writeAtomically(path, `${[...lines, ...missing].join('\n')}\n`);
}

function readIfPresent(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}
