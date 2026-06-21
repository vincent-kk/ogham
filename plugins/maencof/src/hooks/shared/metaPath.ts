import { join } from 'node:path';

import { MAENCOF_META_DIR } from '../../constants/directories.js';

/**
 * Return a path under the maencof meta directory.
 */
export function metaPath(cwd: string, ...segments: string[]): string {
  return join(cwd, MAENCOF_META_DIR, ...segments);
}
