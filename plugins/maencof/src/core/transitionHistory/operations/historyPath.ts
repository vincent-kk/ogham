/**
 * @file historyPath.ts
 * @description transition-history.json 파일 경로를 해석한다.
 */
import { join } from 'node:path';

import { MAENCOF_META_DIR } from '../../../constants/directories.js';
import { TRANSITION_HISTORY_FILE as HISTORY_FILE } from '../../../constants/transitionHistory.js';

export function historyPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, HISTORY_FILE);
}
