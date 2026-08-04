/**
 * @file activityRead.ts
 * @description activity_read MCP 도구 핸들러 — 활동 이벤트 로그(NDJSON) 조회.
 */
import { existsSync } from 'node:fs';

import { MAX_ACTIVITY_READ_ENTRIES } from '../../../constants/thresholds.js';
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
 * 날짜별 활동 이벤트를 조회하고 카테고리 필터링과 응답 엔트리 상한을 적용한다.
 */
export function handleActivityRead(
  vaultPath: string,
  input: ActivityReadInput,
): ActivityReadResult {
  const category = input.category;

  if (input.date) {
    const note = readSingleDay(vaultPath, input.date, category);
    return buildResult(note ? [note] : [], note?.entry_count ?? 0);
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

  return buildResult(notes, totalEntries);
}

/**
 * 응답 엔트리 총수를 `MAX_ACTIVITY_READ_ENTRIES` 로 자른 최종 응답을 조립한다.
 * 최신 날짜(notes 앞쪽) 우선으로 담고, 상한에 걸리는 날짜는 최근(뒤쪽) 엔트리를
 * 남긴다. `total_entries` 는 절단 전 매칭 총합을 유지한다.
 */
function buildResult(
  notes: ActivityReadResult['notes'],
  totalEntries: number,
): ActivityReadResult {
  const capped: ActivityReadResult['notes'] = [];
  let budget = MAX_ACTIVITY_READ_ENTRIES;
  let truncated = false;

  for (const note of notes) {
    if (budget <= 0) {
      truncated = true;
      break;
    }
    if (note.entries.length <= budget) {
      capped.push(note);
      budget -= note.entries.length;
    } else {
      capped.push({
        date: note.date,
        entries: note.entries.slice(-budget),
        entry_count: budget,
      });
      budget = 0;
      truncated = true;
    }
  }

  return {
    notes: capped,
    total_entries: totalEntries,
    ...(truncated && { truncated: true }),
  };
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
