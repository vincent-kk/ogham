import { existsSync } from 'node:fs';

import {
  portableDirname,
  portableJoin,
  samePath,
} from '@ogham/cross-platform/compat';

import { GIT_DIR } from '../../constants/files.js';

/**
 * Walk up from `startDir` to the nearest directory holding a `.git` entry,
 * falling back to `startDir` when there is no repository marker above it.
 *
 * A filesystem walk rather than `git rev-parse`: this runs inside hook
 * processes, where one spawn per session start is the dominant cost.
 * Segmentation and the loop's stop test go through the compat adapters, so
 * a Windows-flavoured path resolves the same way on any runner — the repo
 * root that anchors config and observation records stays stable per runner.
 */
export function findRepoRoot(startDir: string): string {
  let current = startDir;
  for (;;) {
    if (existsSync(portableJoin(current, GIT_DIR))) return current;
    const parent = portableDirname(current);
    if (samePath(parent, current)) return startDir;
    current = parent;
  }
}
