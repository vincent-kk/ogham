/**
 * @file updatePromotionStats.ts
 * @description Record an L5 promotion or archive outcome and persist stats.
 */
import { writeFileSync } from 'node:fs';

import { ensureDir } from './ensureDir.js';
import { metaPath } from './metaPath.js';
import { readInsightStats } from './readInsightStats.js';

export function updatePromotionStats(
  cwd: string,
  action: 'promoted' | 'archived',
): void {
  const stats = readInsightStats(cwd);
  if (action === 'promoted') stats.l5_promoted += 1;
  else stats.l5_archived += 1;
  stats.updatedAt = new Date().toISOString();

  const statsPath = metaPath(cwd, 'auto-insight-stats.json');
  ensureDir(statsPath);
  writeFileSync(statsPath, JSON.stringify(stats), 'utf-8');
}
