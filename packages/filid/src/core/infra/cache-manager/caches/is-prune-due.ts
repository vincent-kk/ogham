import { statSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import {
  PRUNE_MARKER_FILENAME,
  PRUNE_THROTTLE_MS,
} from '../../../../constants/infra-defaults.js';
import { getPluginRoot } from './get-plugin-root.js';

const log = createLogger('cache');

export function isPruneDue(): boolean {
  try {
    const marker = join(getPluginRoot(), PRUNE_MARKER_FILENAME);
    const stat = statSync(marker);
    if (!stat.isFile()) return true;
    return Date.now() - stat.mtimeMs > PRUNE_THROTTLE_MS;
  } catch (e) {
    log.debug('isPruneDue: stat failed, assuming due:', e);
    return true;
  }
}
