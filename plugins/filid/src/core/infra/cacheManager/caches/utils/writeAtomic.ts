import { renameSync, writeFileSync } from 'node:fs';

import { TMP_SUFFIX } from '../constants/cacheFiles.js';

/** Crash-safe write: pid-scoped tmp file swapped into place via atomic rename. */
export function writeAtomic(filePath: string, data: string): void {
  const tmpPath = `${filePath}.${process.pid}${TMP_SUFFIX}`;
  writeFileSync(tmpPath, data);
  renameSync(tmpPath, filePath);
}
