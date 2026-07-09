/**
 * @file logPath.ts
 * @description error-log.json 파일 경로를 해석한다.
 */
import { join } from 'node:path';

import { MAENCOF_META_DIR } from '../../../constants/directories.js';
import { ERROR_LOG_FILE as LOG_FILE } from '../../../constants/errorLog.js';

export function logPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, LOG_FILE);
}
