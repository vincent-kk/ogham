/**
 * @file appendActivityEvent.ts
 * @description 활동 이벤트 한 건을 당일 NDJSON 파일에 append 한다.
 */
import { appendFileSync, mkdirSync } from 'node:fs';

import type { ActivityEntry } from '../../../types/activity.js';
import { formatDate } from '../../dateFormat/index.js';

import { getActivityEventPath } from './getActivityEventPath.js';
import { getActivityEventsDir } from './getActivityEventsDir.js';

export function appendActivityEvent(
  cwd: string,
  entry: ActivityEntry,
  now: Date = new Date(),
): void {
  mkdirSync(getActivityEventsDir(cwd), { recursive: true });
  appendFileSync(
    getActivityEventPath(cwd, formatDate(now)),
    JSON.stringify(entry) + '\n',
    'utf-8',
  );
}
