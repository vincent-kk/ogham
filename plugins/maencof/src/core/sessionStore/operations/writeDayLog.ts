/**
 * @file writeDayLog.ts
 * @description 세션 로그를 당일 파일에 기록한다 (디렉터리 보장 후 pretty JSON).
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import type { SessionDayLog } from '../../../types/session.js';

import { getSessionDayPath } from './getSessionDayPath.js';
import { getSessionsDir } from './getSessionsDir.js';
import { backupCorruptDayLog } from './helpers/backupCorruptDayLog.js';

/**
 * @param cwd 세션 저장소를 소유한 vault 루트.
 * @param log 해당 일자에 저장할 세션 맵.
 * @returns 없음. 손상 원본의 백업 또는 쓰기에 실패하면 예외를 전파한다.
 */
export function writeDayLog(cwd: string, log: SessionDayLog): void {
  mkdirSync(getSessionsDir(cwd), { recursive: true });
  const path = getSessionDayPath(cwd, log.date);
  backupCorruptDayLog(path);
  writeFileSync(
    path,
    JSON.stringify(log, null, 2) + '\n',
    'utf-8',
  );
}
