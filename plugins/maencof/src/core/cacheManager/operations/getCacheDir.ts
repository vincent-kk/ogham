/**
 * @file getCacheDir.ts
 * @description Resolve the plugin cache directory for a given cwd.
 */
import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

import { cwdHash } from './cwdHash.js';

export function getCacheDir(cwd: string): string {
  return join(pluginCache('maencof'), cwdHash(cwd));
}
