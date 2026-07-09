/**
 * @file readDayLog.ts
 * @description 특정 일자의 세션 로그를 읽는다 (없거나 손상 시 빈 로그).
 */
import { existsSync, readFileSync } from 'node:fs';

import type { SessionDayLog } from '../../../types/session.js';

import { getSessionDayPath } from './getSessionDayPath.js';

export function readDayLog(cwd: string, date: string): SessionDayLog {
  const path = getSessionDayPath(cwd, date);
  if (!existsSync(path)) return { date, sessions: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as SessionDayLog;
    if (parsed && typeof parsed === 'object' && parsed.sessions)
      return { date: parsed.date ?? date, sessions: parsed.sessions };
  } catch {
    /* corrupt file — fall through to empty log (no overwrite of recoverable data) */
  }
  return { date, sessions: {} };
}
