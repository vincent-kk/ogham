/**
 * @file getDigestsDir.ts
 * @description digest 디렉터리 (`.maencof-meta/activity/digests/`).
 */
import { join } from 'node:path';

import {
  ACTIVITY_DIR,
  DIGESTS_DIR,
  MAENCOF_META_DIR,
} from '../../../constants/directories.js';

export function getDigestsDir(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, ACTIVITY_DIR, DIGESTS_DIR);
}
