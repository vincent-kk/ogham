import { compressPaths } from './compressPaths.js';
import { displayDir } from './displayDir.js';

/**
 * Build [filid:map] line from visited reads list.
 * Accepts composite visit keys (see visitKey.ts) and strips them to
 * boundary-relative dirs for display.
 */
export function buildMapBlock(
  reads: string[],
  currentDir: string,
  intents: string[],
): string {
  const readDirs = reads.map(displayDir);
  const intentDirs = intents.map(displayDir);
  const compressed = compressPaths(readDirs, currentDir);
  // Unread = in reads but NOT in intents, excluding currentDir (always has active context)
  const unread = [
    ...new Set(
      readDirs.filter(
        (r) => r !== currentDir && intentDirs.indexOf(r) === -1,
      ),
    ),
  ];
  if (unread.length === 0) return `[filid:map] ${compressed}`;

  return `[filid:map] ${compressed}\n  unread-intent: ${unread.join(', ')}`;
}
