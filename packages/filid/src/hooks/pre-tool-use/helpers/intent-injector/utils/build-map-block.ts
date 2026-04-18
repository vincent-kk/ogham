import { compressPaths } from './compress-paths';

/**
 * Build [filid:map] line from visited reads list.
 */
export function buildMapBlock(
  reads: string[],
  currentDir: string,
  intents: string[],
): string {
  const compressed = compressPaths(reads, currentDir);
  // Unread = in reads but NOT in intents, excluding currentDir (always has active context)
  const unread = reads.filter(
    (r) => r !== currentDir && intents.indexOf(r) === -1,
  );
  if (unread.length === 0) {
    return `[filid:map] ${compressed}`;
  }
  return `[filid:map] ${compressed}\n  unread-intent: ${unread.join(', ')}`;
}
