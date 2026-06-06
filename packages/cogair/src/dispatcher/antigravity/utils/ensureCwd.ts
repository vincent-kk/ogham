import { mkdir } from 'node:fs/promises';

import { DIR_MODE } from '../../../constants/defaults.js';
import { antigravityCwdPath } from '../../../constants/paths.js';

export async function ensureCwd(sessionId: string): Promise<string> {
  const cwd = antigravityCwdPath(sessionId);
  await mkdir(cwd, { recursive: true, mode: DIR_MODE });
  return cwd;
}
