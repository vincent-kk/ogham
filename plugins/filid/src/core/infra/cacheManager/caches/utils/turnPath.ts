import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';
import { sessionIdHash } from './sessionIdHash.js';

/** On-disk path of the session turn counter. */
export function turnPath(cwd: string, sessionId: string): string {
  return join(getCacheDir(cwd), `turn-${sessionIdHash(sessionId)}`);
}
