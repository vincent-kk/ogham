/**
 * @file getSessionsDir.ts
 * @description 세션 JSON 디렉터리 경로 (`.maencof-meta/activity/sessions/`).
 */
import { join } from 'node:path';

import {
  ACTIVITY_DIR,
  MAENCOF_META_DIR,
  SESSIONS_DIR,
} from '../../../constants/directories.js';

export function getSessionsDir(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, ACTIVITY_DIR, SESSIONS_DIR);
}
