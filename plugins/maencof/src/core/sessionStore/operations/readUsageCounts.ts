/**
 * @file readUsageCounts.ts
 * @description usage-stats.json 에서 숫자 카운트만 추출 (legacy `skills`/`agents`/`last_updated` 제외).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MAENCOF_META_DIR } from '../../../constants/directories.js';
import { USAGE_STATS_FILE } from '../../../constants/usageStats.js';

export function readUsageCounts(cwd: string): Record<string, number> {
  const path = join(cwd, MAENCOF_META_DIR, USAGE_STATS_FILE);
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<
      string,
      unknown
    >;
    const counts: Record<string, number> = {};
    for (const [key, value] of Object.entries(raw))
      if (typeof value === 'number' && Number.isFinite(value))
        counts[key] = value;

    return counts;
  } catch {
    return {};
  }
}
