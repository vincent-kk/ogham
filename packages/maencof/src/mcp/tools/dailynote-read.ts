/**
 * @file dailynote-read.ts
 * @description dailynote_read MCP 도구 핸들러
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';

import {
  formatDate,
  getDailynoteDir,
  getDailynotePath,
  parseDailynote,
} from '../../core/dailynote-writer.js';
import type {
  DailynoteCategory,
  DailynoteReadInput,
  DailynoteReadResult,
} from '../../types/dailynote.js';

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
 * 단일 날짜의 dailynote를 읽고 파싱한다.
 */
function readSingleDailynote(
  vaultPath: string,
  date: string,
  category?: DailynoteCategory,
): DailynoteReadResult['notes'][number] | null {
  const filePath = getDailynotePath(vaultPath, date);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    let entries = parseDailynote(content);

    if (category) {
      entries = entries.filter((e) => e.category === category);
    }

    return {
      date,
      entries,
      entry_count: entries.length,
    };
  } catch {
    return null;
  }
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
 * dailynotes 디렉토리에 존재하는 날짜 목록을 반환한다.
 * (향후 날짜 범위 조회 등에 활용 가능)
 */
export function listDailynotes(vaultPath: string): string[] {
  const dir = getDailynoteDir(vaultPath);
  if (!existsSync(dir)) return [];

  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
