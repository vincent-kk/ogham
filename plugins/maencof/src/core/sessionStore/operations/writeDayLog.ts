/**
 * @file writeDayLog.ts
 * @description 세션 로그를 당일 파일에 기록한다 (디렉터리 보장 후 pretty JSON).
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import type { SessionDayLog } from '../../../types/session.js';

import { getSessionDayPath } from './getSessionDayPath.js';
import { getSessionsDir } from './getSessionsDir.js';

export function writeDayLog(cwd: string, log: SessionDayLog): void {
  mkdirSync(getSessionsDir(cwd), { recursive: true });
  writeFileSync(
    getSessionDayPath(cwd, log.date),
    JSON.stringify(log, null, 2) + '\n',
    'utf-8',
  );
}
