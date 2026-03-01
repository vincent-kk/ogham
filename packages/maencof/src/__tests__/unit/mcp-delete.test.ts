/**
 * @file mcp-delete.test.ts
 * @description handleMaencofDelete 유닛 테스트
 *
 * 테스트 대상:
 * - Layer 1 보호
 * - backlink 경고 및 force 삭제
 * - stale-nodes 업데이트
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofDelete } from '../../mcp/tools/maencof-delete.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-test-'));
}

async function removeTempVault(vaultPath: string): Promise<void> {
  await rm(vaultPath, { recursive: true, force: true });
}

// ─── handleMaencofDelete ──────────────────────────────────────────────────────

describe('handleMaencofDelete', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  async function createTestFile(
    relativePath: string,
    layer: number = 2,
  ): Promise<void> {
    const absPath = join(vault, relativePath);
    await mkdir(join(vault, relativePath.split('/')[0]), { recursive: true });
    const content = `---\ncreated: 2024-01-01\nupdated: 2024-01-01\ntags: [test]\nlayer: ${layer}\n---\n\n테스트 문서.`;
    await writeFile(absPath, content, 'utf-8');
  }

  it('존재하지 않는 파일은 실패를 반환한다', async () => {
    const result = await handleMaencofDelete(vault, { path: 'nonexistent.md' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('찾을 수 없습니다');
  });

  it('Layer 1 문서 삭제는 금지된다', async () => {
    await createTestFile('01_Core/identity.md', 1);
    const result = await handleMaencofDelete(vault, {
      path: '01_Core/identity.md',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Layer 1');
  });

  it('backlink가 있으면 force=false 시 삭제를 거부한다', async () => {
    await createTestFile('02_Derived/target.md', 2);

    const metaDir = join(vault, '.maencof-meta');
    await mkdir(metaDir, { recursive: true });
    const index = { '02_Derived/target.md': ['02_Derived/source.md'] };
    await writeFile(
      join(metaDir, 'backlink-index.json'),
      JSON.stringify(index),
      'utf-8',
    );

    const result = await handleMaencofDelete(vault, {
      path: '02_Derived/target.md',
      force: false,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('force=true');
  });

  it('force=true이면 backlink가 있어도 삭제한다', async () => {
    await createTestFile('02_Derived/target.md', 2);

    const metaDir = join(vault, '.maencof-meta');
    await mkdir(metaDir, { recursive: true });
    const index = { '02_Derived/target.md': ['02_Derived/source.md'] };
    await writeFile(
      join(metaDir, 'backlink-index.json'),
      JSON.stringify(index),
      'utf-8',
    );

    const result = await handleMaencofDelete(vault, {
      path: '02_Derived/target.md',
      force: true,
    });

    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain('backlink');
  });

  it('삭제 성공 시 stale-nodes에 경로가 추가된다', async () => {
    await createTestFile('02_Derived/to-delete.md', 2);
    await handleMaencofDelete(vault, { path: '02_Derived/to-delete.md' });

    const raw = await readFile(
      join(vault, '.maencof/stale-nodes.json'),
      'utf-8',
    );
    const data = JSON.parse(raw) as { paths: string[] };
    expect(data.paths).toContain('02_Derived/to-delete.md');
  });

  it('Layer 2 문서가 backlink 없이 정상 삭제된다', async () => {
    await createTestFile('02_Derived/simple.md', 2);
    const result = await handleMaencofDelete(vault, {
      path: '02_Derived/simple.md',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('삭제되었습니다');
  });
});
