import { renameSync, writeFileSync } from 'node:fs';

/** Crash-safe write: pid-scoped tmp file swapped into place via atomic rename. */
export function writeAtomic(filePath: string, data: string): void {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmpPath, data);
  renameSync(tmpPath, filePath);
}
