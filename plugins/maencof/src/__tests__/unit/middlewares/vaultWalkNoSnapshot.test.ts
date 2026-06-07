/**
 * @file vaultWalkNoSnapshot.test.ts
 * @description walkVaultForExternalChanges — snapshot 부재 시 no-op (모든 파일을 stale 마킹하지 않는다).
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { walkVaultForExternalChanges } from '../../../mcp/server/middlewares/vaultWalk.js';

let vaultDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-vw-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true, maxRetries: 3 });
});

describe('walkVaultForExternalChanges', () => {
  it('snapshot.json 부재 시 stale-nodes 파일을 만들지 않는다', async () => {
    // 마크다운 한 개 만들어둠 (스캔 대상은 있지만 비교 기준이 없음)
    writeFileSync(join(vaultDir, 'a.md'), '# A\nbody', 'utf-8');

    await walkVaultForExternalChanges(vaultDir);

    const stalePath = join(vaultDir, '.maencof', 'stale-nodes.json');
    expect(existsSync(stalePath)).toBe(false);
  });

  it('snapshot 존재 + 동일 mtime이면 stale 추가 0', async () => {
    const aPath = join(vaultDir, 'a.md');
    writeFileSync(aPath, '# A\nbody', 'utf-8');
    const stats = await import('node:fs').then((m) => m.statSync(aPath));

    writeFileSync(
      join(vaultDir, '.maencof', 'snapshot.json'),
      JSON.stringify({
        entries: [{ path: 'a.md', mtime: stats.mtimeMs, size: stats.size }],
        capturedAt: '2026-01-01',
      }),
      'utf-8',
    );

    await walkVaultForExternalChanges(vaultDir);
    const stalePath = join(vaultDir, '.maencof', 'stale-nodes.json');
    expect(existsSync(stalePath)).toBe(false);
  });

  it('snapshot mtime과 다르면 해당 path가 stale-nodes에 추가된다', async () => {
    const aPath = join(vaultDir, 'a.md');
    writeFileSync(aPath, '# A\nbody', 'utf-8');

    writeFileSync(
      join(vaultDir, '.maencof', 'snapshot.json'),
      JSON.stringify({
        entries: [{ path: 'a.md', mtime: 0, size: 0 }], // 일부러 mismatch
        capturedAt: '2026-01-01',
      }),
      'utf-8',
    );

    await walkVaultForExternalChanges(vaultDir);
    const stalePath = join(vaultDir, '.maencof', 'stale-nodes.json');
    expect(existsSync(stalePath)).toBe(true);
    const stale = JSON.parse(
      await import('node:fs').then((m) => m.readFileSync(stalePath, 'utf-8')),
    ) as { entries: { path: string; op: 'mutate' | 'delete' }[] };
    expect(stale.entries).toContainEqual({ path: 'a.md', op: 'mutate' });
  });
});
