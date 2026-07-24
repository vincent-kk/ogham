import { renameSync, writeFileSync } from 'node:fs';

/**
 * Atomically write `text` to `destPath` via a tmp-file + rename.
 *
 * The sibling `writeFileAtomically` copies a source file; this one takes content, which
 * is what merging rule documents into a single instruction file produces. The file
 * belongs to the user — a partial write would corrupt instructions the host reads on
 * every turn, so it is never truncated in place.
 */
export function writeTextAtomically(destPath: string, text: string): void {
  const tmpPath = `${destPath}.tmp`;
  writeFileSync(tmpPath, text, 'utf8');
  renameSync(tmpPath, destPath);
}
