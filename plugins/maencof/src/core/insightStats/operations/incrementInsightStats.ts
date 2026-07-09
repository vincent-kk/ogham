/**
 * @file incrementInsightStats.ts
 * @description Increment capture counters (L2 or L5) and persist stats.
 */
import { writeFileSync } from 'node:fs';

import { ensureDir } from './ensureDir.js';
import { metaPath } from './metaPath.js';
import { readInsightStats } from './readInsightStats.js';

export function incrementInsightStats(cwd: string, layer: 2 | 5): void {
  const stats = readInsightStats(cwd);
  stats.total_captured += 1;
  if (layer === 2) stats.l2_direct += 1;
  else stats.l5_captured += 1;
  stats.updatedAt = new Date().toISOString();

  const statsPath = metaPath(cwd, 'auto-insight-stats.json');
  ensureDir(statsPath);
  writeFileSync(statsPath, JSON.stringify(stats), 'utf-8');
}
