import { homedir } from 'node:os';
import { join } from 'node:path';

import { cwdHash } from './cwd-hash.js';

export function getCacheDir(cwd: string): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
  return join(configDir, 'plugins', 'filid', cwdHash(cwd));
}
