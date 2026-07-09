/**
 * @file readInsightStats.ts
 * @description Read auto-insight-stats.json, falling back to default stats.
 */
import { existsSync, readFileSync } from 'node:fs';

import { DEFAULT_INSIGHT_STATS } from '../../../constants/insight.js';
import type { InsightStats } from '../../../types/insight.js';

import { metaPath } from './metaPath.js';

export function readInsightStats(cwd: string): InsightStats {
  const statsPath = metaPath(cwd, 'auto-insight-stats.json');
  if (!existsSync(statsPath)) return { ...DEFAULT_INSIGHT_STATS };
  try {
    return JSON.parse(readFileSync(statsPath, 'utf-8')) as InsightStats;
  } catch {
    return { ...DEFAULT_INSIGHT_STATS };
  }
}
