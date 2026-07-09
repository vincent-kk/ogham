/**
 * @file getDailyDigestDir.ts
 * @description daily digest 서브디렉터리 (`digests/<DAILY_DIGEST_SUBDIR>/`).
 */
import { join } from 'node:path';

import { DAILY_DIGEST_SUBDIR } from '../../../constants/workIndex.js';

import { getDigestsDir } from './getDigestsDir.js';

export function getDailyDigestDir(cwd: string): string {
  return join(getDigestsDir(cwd), DAILY_DIGEST_SUBDIR);
}
