import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PRUNE_MARKER_FILENAME } from '../../../../constants/infraDefaults.js';
import { createLogger } from '../../../../lib/logger.js';

import { getPluginRoot } from './utils/getPluginRoot.js';

const log = createLogger('cache');

export function markPruneRun(): void {
  try {
    const dir = getPluginRoot();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, PRUNE_MARKER_FILENAME), '', 'utf-8');
  } catch (e) {
    log.debug('markPruneRun failed:', e);
  }
}
