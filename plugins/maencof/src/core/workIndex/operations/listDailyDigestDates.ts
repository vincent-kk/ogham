/**
 * @file listDailyDigestDates.ts
 * @description daily digest 가 존재하는 일자 목록 (내림차순).
 */
import { existsSync, readdirSync } from 'node:fs';

import { getDailyDigestDir } from './getDailyDigestDir.js';

export function listDailyDigestDates(cwd: string): string[] {
  const dir = getDailyDigestDir(cwd);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
