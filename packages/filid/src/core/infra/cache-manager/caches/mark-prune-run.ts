import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { PRUNE_MARKER_FILENAME } from '../../../../constants/infra-defaults.js';
import { getPluginRoot } from './get-plugin-root.js';

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
