/**
 * @file getDailyDigestPath.ts
 * @description 특정 일자의 daily digest 파일 경로.
 */
import { join } from 'node:path';

import { getDailyDigestDir } from './getDailyDigestDir.js';

export function getDailyDigestPath(cwd: string, date: string): string {
  return join(getDailyDigestDir(cwd), `${date}.json`);
}
