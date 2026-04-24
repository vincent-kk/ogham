import { copyFileSync, renameSync } from 'node:fs';

/**
 * Atomically write `srcPath` to `destPath` via a tmp-file + rename.
 * On POSIX, `renameSync` within the same filesystem is atomic, preventing
 * partial writes from leaving `destPath` in a corrupt state.
 */
export function writeFileAtomically(srcPath: string, destPath: string): void {
  const tmpPath = `${destPath}.tmp`;
  copyFileSync(srcPath, tmpPath);
  renameSync(tmpPath, destPath);
}
