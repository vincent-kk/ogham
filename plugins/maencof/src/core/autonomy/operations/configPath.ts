/**
 * @file configPath.ts
 * @description autonomy-config.json 파일 경로를 해석한다.
 */
import { join } from 'node:path';

import { AUTONOMY_CONFIG_FILE as CONFIG_FILE } from '../../../constants/autonomy.js';
import { MAENCOF_META_DIR } from '../../../constants/directories.js';

export function configPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, CONFIG_FILE);
}
