/**
 * @file background-rebuild-invalidate.test.ts
 * @description triggerBackgroundRebuild 성공 finalize 시 invalidateCache 호출 검증 (Critic issue F).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  _peekRebuildInProgress,
  triggerBackgroundRebuild,
} from '../../../mcp/server/middlewares/background-rebuild.js';
import {
  invalidateCache,
  loadGraphIfNeeded,
} from '../../../mcp/server/graph-cache.js';

let vaultDir: string;

function writeFrontmatterDoc(relPath: string, layer: number): void {
  writeFileSync(
    join(vaultDir, relPath),
    `---\nlayer: ${layer}\ntags: [t]\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n# ${relPath}\nbody\n`,
    'utf-8',
  );
}

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-bgr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  invalidateCache();
});

afterEach(async () => {
  const inflight = _peekRebuildInProgress();
  if (inflight) await inflight.catch(() => undefined);
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
  invalidateCache();
});

describe('triggerBackgroundRebuild', () => {
  it('rebuild 성공 후 캐시가 invalidate되어 다음 read는 disk에서 reload', async () => {
    writeFrontmatterDoc('a.md', 2);

    // 사전: 임의의 캐시 채움 (가짜 graph reference)
    // loadGraphIfNeeded → 디스크에 인덱스 없음 → null
    expect(await loadGraphIfNeeded(vaultDir)).toBeNull();

    triggerBackgroundRebuild(vaultDir);
    const inflight = _peekRebuildInProgress();
    expect(inflight).not.toBeNull();
    await inflight!;

    // rebuild 후 disk에 index.json이 생겼고, invalidateCache가 호출되었으므로
    // 다음 loadGraphIfNeeded는 디스크에서 새로 로드한다.
    const reloaded = await loadGraphIfNeeded(vaultDir);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.nodes.size).toBeGreaterThan(0);
  });

  it('이미 rebuild 진행 중이면 중복 트리거는 no-op (mutex)', async () => {
    writeFrontmatterDoc('a.md', 2);
    triggerBackgroundRebuild(vaultDir);
    const first = _peekRebuildInProgress();
    expect(first).not.toBeNull();

    // 두 번째 트리거 — 같은 promise 유지
    triggerBackgroundRebuild(vaultDir);
    const second = _peekRebuildInProgress();
    expect(second).toBe(first);

    await first;
  });
});
