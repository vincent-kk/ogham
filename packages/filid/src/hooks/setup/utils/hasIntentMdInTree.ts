import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { SCAN_SKIP_DIRS } from '../../../constants/scan-defaults.js';

/**
 * Shallow BFS scan for INTENT.md in the project tree.
 * Returns true on first match, false if none found within maxDepth.
 */
export function hasIntentMdInTree(
  rootDir: string,
  maxDepth: number = 4,
): boolean {
  const queue: Array<{ dir: string; depth: number }> = [
    { dir: rootDir, depth: 0 },
  ];

  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!;
    if (depth > maxDepth) continue;

    if (existsSync(join(dir, 'INTENT.md'))) return true;

    if (depth === maxDepth) continue;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (SCAN_SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        queue.push({ dir: join(dir, entry.name), depth: depth + 1 });
      }
    } catch {
      // Permission denied or other FS error — skip silently
    }
  }

  return false;
}
