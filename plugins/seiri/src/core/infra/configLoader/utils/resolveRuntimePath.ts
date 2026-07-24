import { portableJoin } from '@ogham/cross-platform/compat';

import { CONFIG_DIR, RUNTIME_FILE } from '../../../../constants/files.js';
import { findRepoRoot } from '../../../utils/findRepoRoot.js';

/**
 * Absolute path of a project's `.seiri/runtime.json`.
 *
 * Anchored at the repository root like the baseline it overrides. Two
 * worktrees of the same repository resolve to different roots, so a valve
 * one of them turns never reaches the other.
 */
export function resolveRuntimePath(projectRoot: string): string {
  return portableJoin(findRepoRoot(projectRoot), CONFIG_DIR, RUNTIME_FILE);
}
