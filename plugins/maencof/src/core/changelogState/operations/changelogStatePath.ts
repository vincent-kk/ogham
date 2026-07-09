/**
 * @file changelogStatePath.ts
 * @description changelog-state.json 파일 경로를 해석한다.
 */
import { join } from 'node:path';

import { CHANGELOG_STATE_FILE } from '../../../constants/changelog.js';
import { MAENCOF_META_DIR } from '../../../constants/directories.js';

export function changelogStatePath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, CHANGELOG_STATE_FILE);
}
