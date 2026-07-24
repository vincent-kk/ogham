import { portableJoin } from '@ogham/cross-platform/compat';

import { CONFIG_DIR, CONFIG_FILE } from '../../../../constants/files.js';
import { findRepoRoot } from '../../../utils/findRepoRoot.js';

/**
 * Absolute path of a project's `.seiri/config.json`.
 *
 * Anchored at the repository root, not at the caller's directory, so the
 * dial a team commits applies from every subdirectory of the checkout.
 */
export function resolveConfigPath(projectRoot: string): string {
  return portableJoin(findRepoRoot(projectRoot), CONFIG_DIR, CONFIG_FILE);
}
