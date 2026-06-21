import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { MAENCOF_DIR, MAENCOF_META_DIR } from '../../constants/directories.js';

/**
 * Check whether the current working directory is a maencof vault.
 * Determined by the presence of .maencof/ or .maencof-meta/ directories.
 */
export function isMaencofVault(cwd: string): boolean {
  return (
    existsSync(join(cwd, MAENCOF_DIR)) ||
    existsSync(join(cwd, MAENCOF_META_DIR))
  );
}
