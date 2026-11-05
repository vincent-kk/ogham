/** @file graphCache.loadErrors.test.ts MCP 캐시 읽기 오류의 안전 로그 연결 회귀 검사. */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CACHE_FILES } from '../../../../constants/cacheFiles.js';
import { readErrorLog } from '../../../../core/errorLog/index.js';
import { invalidateCache, loadGraphIfNeeded } from '../graphCache.js';

describe('graphCache load diagnostics', () => {
  let vaultPath: string;

  beforeEach(async () => {
    invalidateCache();
    vaultPath = await mkdtemp(join(tmpdir(), 'maencof-graph-load-errors-'));
  });

  afterEach(async () => {
    invalidateCache();
    await rm(vaultPath, { recursive: true, force: true });
  });

  it('records a corrupt committed graph through the safe error log', async () => {
    const cacheDir = join(vaultPath, '.maencof');
    await mkdir(cacheDir);
    await writeFile(
      join(cacheDir, CACHE_FILES.GRAPH_META),
      JSON.stringify({ schemaVersion: 2 }),
    );
    await writeFile(join(cacheDir, CACHE_FILES.NODES), '{broken json');
    await writeFile(join(cacheDir, CACHE_FILES.EDGES), '[]');

    await expect(loadGraphIfNeeded(vaultPath)).resolves.toBeNull();
    expect(readErrorLog(vaultPath)).toEqual([
      expect.objectContaining({
        hook: 'graph-cache-load',
        error: expect.stringContaining('SyntaxError'),
      }),
    ]);
  });

  it('does not log an unbuilt vault as an error', async () => {
    await expect(loadGraphIfNeeded(vaultPath)).resolves.toBeNull();
    expect(readErrorLog(vaultPath)).toEqual([]);
  });
});
