import { existsSync, mkdirSync } from 'node:fs';

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
 * Create `<repoRoot>/.seiri/` and, the first time, the ignore file that
 * keeps its untracked members out of commits. Returns the directory.
 *
 * The ignore file lives inside `.seiri/` rather than in the repository's
 * root `.gitignore` so that turning the dial down for an afternoon never
 * edits a file the team owns. An existing one is left exactly as found —
 * a project that wrote its own rules there meant them.
 */
export function ensureSeiriDir(projectRoot: string): string {
  const dir = portableJoin(findRepoRoot(projectRoot), CONFIG_DIR);
  mkdirSync(dir, { recursive: true });

  const ignorePath = portableJoin(dir, IGNORE_FILE);
  if (!existsSync(ignorePath))
    writeAtomically(
      ignorePath,
      `${[IGNORE_HEADER, ...UNTRACKED_CONFIG_FILES].join('\n')}\n`,
    );

  return dir;
}
