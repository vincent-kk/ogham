/**
 * @file rebuildAndInvalidate.test.ts
 * @description explicit kg_build 경로의 build+invalidate 계약 회귀 검증. build 후 캐시가
 * invalidate되어 동일 세션 후속 read(loadGraphIfNeeded 경유 kg_status 포함)가 stale 캐시가
 * 아닌 갓 빌드된 그래프 수치를 반영함을 확인한다.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  invalidateCache,
  loadGraphIfNeeded,
} from '../../../mcp/server/graphCache/index.js';
import { rebuildAndInvalidate } from '../../../mcp/server/middlewares/rebuildAndInvalidate.js';
import { handleKgBuild } from '../../../mcp/tools/kgBuild/index.js';
import { handleKgStatus } from '../../../mcp/tools/kgStatus/index.js';

let vaultDir: string;

function writeDoc(relPath: string, layer: number): void {
  writeFileSync(
    join(vaultDir, relPath),
    `---\nlayer: ${layer}\ntags: [t]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n# ${relPath}\nbody\n`,
    'utf-8',
  );
}

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-rai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  invalidateCache();
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  invalidateCache();
});

describe('rebuildAndInvalidate', () => {
  it('build 성공 후 캐시를 invalidate해 후속 read가 갓 빌드된 수치를 반영한다', async () => {
    // state A: 1 doc → disk index
    writeDoc('a.md', 2);
    await handleKgBuild(vaultDir, { force: true });

    // 캐시를 state A로 채운다 (kg_status 의 loadGraphIfNeeded 경로)
    const cachedA = await loadGraphIfNeeded(vaultDir);
    expect(cachedA?.nodeCount).toBe(1);

    // 디스크에 2번째 문서 추가 → state B
    writeDoc('b.md', 2);

    // explicit kg_build 등록부가 수행하는 계약
    const result = await rebuildAndInvalidate(vaultDir, { force: true });
    expect(result.success).toBe(true);
    expect(result.nodeCount).toBe(2);

    // invalidate 덕분에 후속 read 는 stale 캐시(A)가 아니라 disk 의 state B 를 reload
    const reloaded = await loadGraphIfNeeded(vaultDir);
    expect(reloaded?.nodeCount).toBe(2);

    const status = await handleKgStatus(vaultDir, reloaded, {});
    expect(status.nodeCount).toBe(2);
  });

  it('build 성공 후 훅 주입용 turn-context 스냅샷도 새 인덱스를 반영한다', async () => {
    const configDir = join(vaultDir, 'claude-config-isolated');
    process.env.CLAUDE_CONFIG_DIR = configDir;
    try {
      writeDoc('a.md', 2);
      await rebuildAndInvalidate(vaultDir, { force: true });

      const { readTurnContext } =
        await import('../../../core/cacheManager/index.js');
      expect(readTurnContext(vaultDir)).toContain('nodes="1"');

      writeDoc('b.md', 2);
      await rebuildAndInvalidate(vaultDir, { force: true });

      expect(readTurnContext(vaultDir)).toContain('nodes="2"');
    } finally {
      delete process.env.CLAUDE_CONFIG_DIR;
    }
  });
});
