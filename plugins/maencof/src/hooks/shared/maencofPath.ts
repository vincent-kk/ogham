import { join } from 'node:path';

import { MAENCOF_DIR } from '../../constants/directories.js';

/**
 * Return a path under the maencof index directory.
 */
export function maencofPath(cwd: string, ...segments: string[]): string {
  return join(cwd, MAENCOF_DIR, ...segments);
}
