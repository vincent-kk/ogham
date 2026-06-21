/**
 * @file activityLog.ts
 * @description 활동 이벤트 로그 — 일자별 NDJSON(`activity/events/YYYY-MM-DD.jsonl`).
 *
 * 한 줄 = 이벤트 1개(ActivityEntry). append 비용이 싸고, 라인 단위 JSON 파싱이라
 * 정규식보다 견고하며 한 줄 손상이 파일 전체를 깨지 않는다. 저장 포맷은 내부 구현 —
 * activity_read 가 테이블로 재렌더링한다.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACTIVITY_DIR,
  EVENTS_DIR,
  MAENCOF_META_DIR,
} from '../../constants/directories.js';
import type { ActivityEntry } from '../../types/activity.js';
import { formatDate } from '../dateFormat/index.js';

/** 활동 이벤트 로그 디렉터리 (`.maencof-meta/activity/events/`). */
export function getActivityEventsDir(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, ACTIVITY_DIR, EVENTS_DIR);
}

/** 특정 일자의 활동 이벤트 파일 경로 (`*.jsonl`). */
export function getActivityEventPath(cwd: string, date: string): string {
  return join(getActivityEventsDir(cwd), `${date}.jsonl`);
}

/** 활동 이벤트 한 건을 당일 NDJSON 파일에 append 한다. */
export function appendActivityEvent(
  cwd: string,
  entry: ActivityEntry,
  now: Date = new Date(),
): void {
  mkdirSync(getActivityEventsDir(cwd), { recursive: true });
  appendFileSync(
    getActivityEventPath(cwd, formatDate(now)),
    JSON.stringify(entry) + '\n',
    'utf-8',
  );
}

/** 특정 일자의 활동 이벤트를 파싱한다. 손상된 라인은 건너뛴다(NDJSON 복원력). */
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
      ) {
        entries.push(parsed);
      }
    } catch {
      /* skip a single corrupt line */
    }
  }
  return entries;
}
