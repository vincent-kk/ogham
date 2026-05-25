import { statSync } from 'node:fs';
import { join } from 'node:path';

import {
  PRUNE_MARKER_FILENAME,
  PRUNE_THROTTLE_MS,
} from '../../../../constants/infra-defaults.js';
import { createLogger } from '../../../../lib/logger.js';

import { getCacheDir } from './get-cache-dir.js';

const log = createLogger('cache');

export function isSessionPruneDue(cwd: string): boolean {
  try {
    const marker = join(getCacheDir(cwd), PRUNE_MARKER_FILENAME);
    const stat = statSync(marker);
    if (!stat.isFile()) return true;
    return Date.now() - stat.mtimeMs > PRUNE_THROTTLE_MS;
  } catch (e) {
    log.debug('isSessionPruneDue: stat failed, assuming due:', e);
    return true;
  }
}
