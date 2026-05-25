import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PRUNE_MARKER_FILENAME } from '../../../../constants/infra-defaults.js';
import { createLogger } from '../../../../lib/logger.js';

import { getCacheDir } from './get-cache-dir.js';

const log = createLogger('cache');

export function markSessionPruneRun(cwd: string): void {
  try {
    const dir = getCacheDir(cwd);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, PRUNE_MARKER_FILENAME), '', 'utf-8');
  } catch (e) {
    log.debug('markSessionPruneRun failed:', e);
  }
}
