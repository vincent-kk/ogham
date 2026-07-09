/**
 * @file getActivityEventsDir.ts
 * @description 활동 이벤트 로그 디렉터리 (`.maencof-meta/activity/events/`).
 */
import { join } from 'node:path';

import {
  ACTIVITY_DIR,
  EVENTS_DIR,
  MAENCOF_META_DIR,
} from '../../../constants/directories.js';

export function getActivityEventsDir(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, ACTIVITY_DIR, EVENTS_DIR);
}
