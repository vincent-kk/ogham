/**
 * @file personalContextPath.ts
 * @description personal-context.json 파일 경로를 해석한다.
 */
import { join } from 'node:path';

import { MAENCOF_META_DIR } from '../../constants/directories.js';
import { PERSONAL_CONTEXT_FILE } from '../../constants/personalContext.js';

export function personalContextPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, PERSONAL_CONTEXT_FILE);
}
