/**
 * @file activityRead.ts
 * @description activity_read MCP 도구 핸들러 — 활동 이벤트 로그(NDJSON) 조회.
 */
import { existsSync } from 'node:fs';

import {
  getActivityEventPath,
  readActivityEvents,
} from '../../../core/activityLog/index.js';
import { formatDate } from '../../../core/dateFormat/index.js';
import type {
  ActivityCategory,
  ActivityReadInput,
  ActivityReadResult,
} from '../../../types/activity.js';

/**
 * activity_read 도구 핸들러.
 * 날짜별 활동 이벤트를 조회하고 카테고리 필터링을 적용한다.
 */
export function handleActivityRead(
  vaultPath: string,
  input: ActivityReadInput,
): ActivityReadResult {
  const category = input.category;

  if (input.date) {
    const note = readSingleDay(vaultPath, input.date, category);
    return {
      notes: note ? [note] : [],
      total_entries: note?.entry_count ?? 0,
    };
  }

  const lastDays = Math.min(Math.max(input.last_days ?? 1, 1), 30);
  const notes: ActivityReadResult['notes'] = [];
  let totalEntries = 0;

  for (const date of getRecentDates(lastDays)) {
    const note = readSingleDay(vaultPath, date, category);
    if (note && note.entry_count > 0) {
      notes.push(note);
      totalEntries += note.entry_count;
    }
  }

  return { notes, total_entries: totalEntries };
}

/** 단일 날짜의 활동 이벤트를 읽고 카테고리 필터를 적용한다 (파일 부재 시 null). */
function readSingleDay(
  vaultPath: string,
  date: string,
  category?: ActivityCategory,
): ActivityReadResult['notes'][number] | null {
  if (!existsSync(getActivityEventPath(vaultPath, date))) return null;

  let entries = readActivityEvents(vaultPath, date);
  if (category) entries = entries.filter((e) => e.category === category);

  return { date, entries, entry_count: entries.length };
}

/** 최근 N일의 날짜 목록을 반환한다 (최신순). */
function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}
