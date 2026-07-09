/**
 * @file readSessionDayLog.ts
 * @description 특정 일자의 세션 로그를 읽는다 (없거나 손상 시 빈 로그).
 */
import type { SessionDayLog } from '../../../types/session.js';

import { readDayLog } from './readDayLog.js';

export function readSessionDayLog(cwd: string, date: string): SessionDayLog {
  return readDayLog(cwd, date);
}
