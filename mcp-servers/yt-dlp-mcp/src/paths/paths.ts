import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';

import type { Config } from '../config/index.js';
import { LOCAL_BINARY_NAME } from '../constants/github.js';

export interface Paths {
  home: string;
  binDir: string;
  tempDir: string;
  downloadsDir: string;
  binaryPath: string;
  metaPath: string;
  lockPath: string;
  ensureBaseDirs(): Promise<void>;
  makeTempDir(prefix?: string): Promise<string>;
}

/**
 * Resolves the single ~/.yt-dlp tree (ADR-9). Single responsibility for path
 * derivation, creation, and temp-dir allocation.
 */
export function createPaths(config: Config): Paths {
  const { home, downloadsDir } = config.paths;
  const binDir = path.join(home, 'bin');
  const tempDir = path.join(home, 'temp');

  return {
    home,
    binDir,
    tempDir,
    downloadsDir,
    binaryPath: path.join(binDir, LOCAL_BINARY_NAME),
    metaPath: path.join(binDir, 'version.json'),
    lockPath: path.join(binDir, '.lock'),

    async ensureBaseDirs(): Promise<void> {
      await mkdir(binDir, { recursive: true });
      await mkdir(tempDir, { recursive: true });
      await mkdir(downloadsDir, { recursive: true });
    },

    async makeTempDir(prefix = 'op-'): Promise<string> {
      await mkdir(tempDir, { recursive: true });
      return mkdtemp(path.join(tempDir, prefix));
    },
  };
}

export async function removeDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
