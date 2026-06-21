/**
 * @file dailynoteRead.ts
 * @description dailynote_read MCP 도구 핸들러
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';

import {
  getActivityDir,
  getActivityPath,
  readActivityEntries,
} from '../../../core/activityLog/index.js';
import {
  formatDate,
  getDailynoteDir,
  getDailynotePath,
  parseDailynote,
} from '../../../core/dailynoteWriter/index.js';
import type {
  DailynoteCategory,
  DailynoteEntry,
  DailynoteReadInput,
  DailynoteReadResult,
} from '../../../types/dailynote.js';

/**
 * dailynote_read 도구 핸들러.
 * 날짜별 dailynote를 조회하고 카테고리 필터링을 적용한다.
 */
export function handleDailynoteRead(
  vaultPath: string,
  input: DailynoteReadInput,
): DailynoteReadResult {
  const category = input.category as DailynoteCategory | undefined;

  // date가 지정되면 단일 날짜 조회
  if (input.date) {
    const note = readSingleDailynote(vaultPath, input.date, category);
    return {
      notes: note ? [note] : [],
      total_entries: note?.entry_count ?? 0,
    };
  }

  // last_days로 최근 N일 조회 (기본 1, 최대 30)
  const lastDays = Math.min(Math.max(input.last_days ?? 1, 1), 30);
  const dates = getRecentDates(lastDays);
  const notes: DailynoteReadResult['notes'] = [];
  let totalEntries = 0;

  for (const date of dates) {
    const note = readSingleDailynote(vaultPath, date, category);
    if (note && note.entry_count > 0) {
      notes.push(note);
      totalEntries += note.entry_count;
    }
  }

  return { notes, total_entries: totalEntries };
}

/**
 * 단일 날짜의 활동 로그를 읽고 파싱한다.
 *
 * 신규 활동 로그(NDJSON `activity/*.jsonl`)와 레거시 `dailynotes/*.md`(전환기)를
 * 병합하고 시간순 정렬한다. 둘 다 없으면 null.
 */
function readSingleDailynote(
  vaultPath: string,
  date: string,
  category?: DailynoteCategory,
): DailynoteReadResult['notes'][number] | null {
  const activityExists = existsSync(getActivityPath(vaultPath, date));
  const legacyPath = getDailynotePath(vaultPath, date);
  const legacyExists = existsSync(legacyPath);

  if (!activityExists && !legacyExists) {
    return null;
  }

  const activityEntries = readActivityEntries(vaultPath, date);
  let legacyEntries: DailynoteEntry[] = [];
  if (legacyExists) {
    try {
      legacyEntries = parseDailynote(readFileSync(legacyPath, 'utf-8'));
    } catch {
      /* ignore corrupt legacy file */
    }
  }

  let entries = [...activityEntries, ...legacyEntries].sort((a, b) =>
    a.time < b.time ? -1 : a.time > b.time ? 1 : 0,
  );

  if (category) {
    entries = entries.filter((e) => e.category === category);
  }

  return {
    date,
    entries,
    entry_count: entries.length,
  };
}

/**
 * 최근 N일의 날짜 목록을 반환한다 (최신순).
 */
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

/**
 * 활동 로그가 존재하는 날짜 목록을 반환한다 (신규 `*.jsonl` + 레거시 `*.md` 합집합).
 */
export function listDailynotes(vaultPath: string): string[] {
  const dates = new Set<string>();

  const legacyDir = getDailynoteDir(vaultPath);
  if (existsSync(legacyDir)) {
    try {
      for (const f of readdirSync(legacyDir)) {
        if (f.endsWith('.md')) dates.add(f.replace(/\.md$/, ''));
      }
    } catch {
      /* ignore */
    }
  }

  const activityDir = getActivityDir(vaultPath);
  if (existsSync(activityDir)) {
    try {
      for (const f of readdirSync(activityDir)) {
        if (f.endsWith('.jsonl')) dates.add(f.replace(/\.jsonl$/, ''));
      }
    } catch {
      /* ignore */
    }
  }

  return [...dates].sort().reverse();
}
