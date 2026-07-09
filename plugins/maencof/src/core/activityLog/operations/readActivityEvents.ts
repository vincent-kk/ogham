/**
 * @file readActivityEvents.ts
 * @description 특정 일자의 활동 이벤트를 파싱한다. 손상된 라인은 건너뛴다(NDJSON 복원력).
 */
import { existsSync, readFileSync } from 'node:fs';

import type { ActivityEntry } from '../../../types/activity.js';

import { getActivityEventPath } from './getActivityEventPath.js';

export function readActivityEvents(cwd: string, date: string): ActivityEntry[] {
  const path = getActivityEventPath(cwd, date);
  if (!existsSync(path)) return [];

  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch {
    return [];
  }

  const entries: ActivityEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as ActivityEntry;
      if (
        parsed &&
        typeof parsed.time === 'string' &&
        typeof parsed.category === 'string' &&
        typeof parsed.description === 'string'
      )
        entries.push(parsed);
    } catch {
      /* skip a single corrupt line */
    }
  }
  return entries;
}
