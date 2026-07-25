import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths/plugin-cache';

import { cwdHash } from './cwdHash.js';

export function getCacheDir(cwd: string): string {
  return join(pluginCache('filid'), cwdHash(cwd));
}
