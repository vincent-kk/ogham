/**
 * @file getActivityEventPath.ts
 * @description 특정 일자의 활동 이벤트 파일 경로 (`*.jsonl`).
 */
import { join } from 'node:path';

import { getActivityEventsDir } from './getActivityEventsDir.js';

export function getActivityEventPath(cwd: string, date: string): string {
  return join(getActivityEventsDir(cwd), `${date}.jsonl`);
}
