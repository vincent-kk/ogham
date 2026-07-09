/**
 * @file metaPath.ts
 * @description Build a path under the vault's `.maencof-meta/` directory.
 */
import { join } from 'node:path';

import { MAENCOF_META_DIR } from '../../../constants/directories.js';

export function metaPath(cwd: string, ...segments: string[]): string {
  return join(cwd, MAENCOF_META_DIR, ...segments);
}
