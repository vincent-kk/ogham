/**
 * @file readPinnedNodes.ts
 * @description Read vault-scoped pinned nodes from the cache.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PinnedNode } from '../types/types.js';

import { getCacheDir } from './getCacheDir.js';

export function readPinnedNodes(cwd: string): PinnedNode[] {
  const pinnedFile = join(getCacheDir(cwd), 'pinned-nodes.json');
  try {
    if (!existsSync(pinnedFile)) return [];
    const raw = readFileSync(pinnedFile, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PinnedNode[]) : [];
  } catch {
    return [];
  }
}
