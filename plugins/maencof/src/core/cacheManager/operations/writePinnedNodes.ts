/**
 * @file writePinnedNodes.ts
 * @description Persist vault-scoped pinned nodes, evicting oldest past the max limit.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { MAX_PINNED_NODES } from '../../../constants/performance.js';
import type { PinnedNode } from '../types/types.js';

import { getCacheDir } from './getCacheDir.js';

export function writePinnedNodes(cwd: string, nodes: PinnedNode[]): void {
  const cacheDir = getCacheDir(cwd);
  const pinnedFile = join(cacheDir, 'pinned-nodes.json');
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    // Enforce max limit — evict oldest by pinnedAt
    let toWrite = nodes;
    if (toWrite.length > MAX_PINNED_NODES)
      toWrite = [...toWrite]
        .sort(
          (a, b) =>
            new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime(),
        )
        .slice(0, MAX_PINNED_NODES);

    writeFileSync(pinnedFile, JSON.stringify(toWrite), 'utf-8');
  } catch {
    // silently ignore
  }
}
