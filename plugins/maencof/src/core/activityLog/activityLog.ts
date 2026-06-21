/**
 * @file activityLog.ts
 * @description 활동 이벤트 로그 — 일자별 NDJSON(append-only).
 *
 * `dailynotes/activity/YYYY-MM-DD.jsonl` 의 한 줄 = 이벤트 1개(DailynoteEntry).
 * 레거시 `dailynotes/*.md` 를 대체한다: append 비용은 동일하고, 라인 단위 JSON 파싱이라
 * 정규식보다 견고하며 한 줄 손상이 파일 전체를 깨지 않는다. 저장 포맷은 내부 구현 —
 * dailynote_read 가 동일 테이블로 재렌더링하므로 사용자 가독성 손실이 없다.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACTIVITY_DIR,
  DAILYNOTES_DIR,
  MAENCOF_META_DIR,
} from '../../constants/directories.js';
import type { DailynoteEntry } from '../../types/dailynote.js';

/** 활동 로그 디렉터리 (`.maencof-meta/dailynotes/activity/`). */
export function getActivityDir(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, DAILYNOTES_DIR, ACTIVITY_DIR);
}

/** 특정 일자의 활동 로그 파일 경로 (`*.jsonl`). */
export function getActivityPath(cwd: string, date: string): string {
  return join(getActivityDir(cwd), `${date}.jsonl`);
}

/** 활동 이벤트 한 건을 당일 NDJSON 파일에 append 한다. */
export function appendActivityEntry(
  cwd: string,
  entry: DailynoteEntry,
  now: Date = new Date(),
): void {
  mkdirSync(getActivityDir(cwd), { recursive: true });
  appendFileSync(
    getActivityPath(cwd, toDateString(now)),
    JSON.stringify(entry) + '\n',
    'utf-8',
  );
}

/** 특정 일자의 활동 이벤트를 파싱한다. 손상된 라인은 건너뛴다(NDJSON 복원력). */
export function readActivityEntries(
  cwd: string,
  date: string,
): DailynoteEntry[] {
  const path = getActivityPath(cwd, date);
  if (!existsSync(path)) return [];

  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch {
    return [];
  }

  const entries: DailynoteEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as DailynoteEntry;
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

function toDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
