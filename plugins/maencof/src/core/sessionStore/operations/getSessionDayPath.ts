/**
 * @file getSessionDayPath.ts
 * @description 특정 일자의 세션 로그 파일 경로.
 */
import { join } from 'node:path';

import { getSessionsDir } from './getSessionsDir.js';

export function getSessionDayPath(cwd: string, date: string): string {
  return join(getSessionsDir(cwd), `${date}.json`);
}
