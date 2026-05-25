import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

import { cwdHash } from './cwd-hash.js';

export function getCacheDir(cwd: string): string {
  return join(pluginCache('filid'), cwdHash(cwd));
}
