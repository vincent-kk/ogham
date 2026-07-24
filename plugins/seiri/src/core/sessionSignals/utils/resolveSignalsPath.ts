import { portableJoin } from '@ogham/cross-platform/compat';

import { CONFIG_DIR, SIGNALS_FILE } from '../../../constants/files.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';

/**
 * Absolute path of a project's `.seiri/session-signals.json`.
 *
 * Anchored at the repository root, like the dial, so a chain of failures
 * counts the same whichever subdirectory the commands ran from.
 */
export function resolveSignalsPath(projectRoot: string): string {
  return portableJoin(findRepoRoot(projectRoot), CONFIG_DIR, SIGNALS_FILE);
}
