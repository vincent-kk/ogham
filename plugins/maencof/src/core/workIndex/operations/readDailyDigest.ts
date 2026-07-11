/**
 * @file readDailyDigest.ts
 * @description 특정 일자의 daily digest 를 읽는다 (없거나 손상 시 null).
 */
import { existsSync, readFileSync } from 'node:fs';

import type { DailyDigest } from '../../../types/workHistory.js';

import { getDailyDigestPath } from './getDailyDigestPath.js';

export function readDailyDigest(cwd: string, date: string): DailyDigest | null {
  const path = getDailyDigestPath(cwd, date);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as DailyDigest;
    if (parsed && typeof parsed.date === 'string') return parsed;
  } catch {
    /* corrupt digest — 다음 sweep 마감 시 재생성 */
  }
  return null;
}
