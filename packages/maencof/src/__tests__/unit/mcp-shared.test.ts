/**
 * @file mcp-shared.test.ts
 * @description shared.ts 유닛 테스트
 *
 * 테스트 대상:
 * - appendStaleNode
 * - getBacklinks / removeBacklinks
 * - toolResult / toolError / mapReplacer
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  appendStaleNode,
  getBacklinks,
  mapReplacer,
  removeBacklinks,
  toolError,
  toolResult,
} from '../../mcp/shared.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-test-'));
}

async function removeTempVault(vaultPath: string): Promise<void> {
  await rm(vaultPath, { recursive: true, force: true });
}

// ─── shared.ts ────────────────────────────────────────────────────────────────

describe('shared.ts', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  describe('appendStaleNode', () => {
    it('stale-nodes.json이 없을 때 새로 생성한다', async () => {
      await appendStaleNode(vault, '01_Core/test.md');
      const raw = await readFile(
        join(vault, '.maencof/stale-nodes.json'),
        'utf-8',
      );
      const data = JSON.parse(raw) as { paths: string[]; updatedAt: string };
      expect(data.paths).toContain('01_Core/test.md');
      expect(data.updatedAt).toBeTruthy();
    });

    it('기존 stale-nodes.json에 경로를 추가한다', async () => {
      await appendStaleNode(vault, '01_Core/first.md');
      await appendStaleNode(vault, '02_Derived/second.md');
      const raw = await readFile(
        join(vault, '.maencof/stale-nodes.json'),
        'utf-8',
      );
      const data = JSON.parse(raw) as { paths: string[] };
      expect(data.paths).toContain('01_Core/first.md');
      expect(data.paths).toContain('02_Derived/second.md');
    });

    it('중복 경로를 추가하지 않는다', async () => {
      await appendStaleNode(vault, '01_Core/test.md');
      await appendStaleNode(vault, '01_Core/test.md');
      const raw = await readFile(
        join(vault, '.maencof/stale-nodes.json'),
        'utf-8',
      );
      const data = JSON.parse(raw) as { paths: string[] };
      expect(data.paths.filter((p) => p === '01_Core/test.md')).toHaveLength(1);
    });
  });

  describe('getBacklinks / removeBacklinks', () => {
    it('backlink-index.json이 없을 때 빈 배열을 반환한다', async () => {
      const result = await getBacklinks(vault, '01_Core/target.md');
      expect(result).toEqual([]);
    });

    it('backlink-index.json에서 대상 파일의 backlink를 반환한다', async () => {
      const metaDir = join(vault, '.maencof-meta');
      await mkdir(metaDir, { recursive: true });
      const index = {
        '01_Core/target.md': ['02_Derived/source.md', '03_External/ref.md'],
      };
      await writeFile(
        join(metaDir, 'backlink-index.json'),
        JSON.stringify(index),
        'utf-8',
      );

      const result = await getBacklinks(vault, '01_Core/target.md');
      expect(result).toEqual(['02_Derived/source.md', '03_External/ref.md']);
    });

    it('removeBacklinks가 소스 경로의 출처 항목을 제거한다', async () => {
      const metaDir = join(vault, '.maencof-meta');
      await mkdir(metaDir, { recursive: true });
      const index = {
        '01_Core/target.md': ['02_Derived/source.md', '03_External/ref.md'],
        '01_Core/other.md': ['02_Derived/source.md'],
      };
      await writeFile(
        join(metaDir, 'backlink-index.json'),
        JSON.stringify(index),
        'utf-8',
      );

      await removeBacklinks(vault, '02_Derived/source.md');

      const raw = await readFile(join(metaDir, 'backlink-index.json'), 'utf-8');
      const updated = JSON.parse(raw) as Record<string, string[]>;
      expect(updated['01_Core/target.md']).toEqual(['03_External/ref.md']);
      expect(updated['01_Core/other.md']).toBeUndefined(); // 빈 배열 → 키 삭제
    });
  });

  describe('toolResult / toolError', () => {
    it('toolResult가 MCP content 포맷을 반환한다', () => {
      const result = toolResult({ success: true, path: 'test.md' });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text) as { success: boolean };
      expect(parsed.success).toBe(true);
    });

    it('toolError가 isError=true를 포함한 MCP content 포맷을 반환한다', () => {
      const result = toolError(new Error('테스트 에러'));
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('테스트 에러');
    });

    it('toolError가 Error가 아닌 값도 처리한다', () => {
      const result = toolError('string error');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('string error');
    });

    it('mapReplacer가 Map을 일반 객체로 변환한다', () => {
      const map = new Map([['key', 'value']]);
      const result = mapReplacer('', map);
      expect(result).toEqual({ key: 'value' });
    });

    it('mapReplacer가 Set을 배열로 변환한다', () => {
      const set = new Set([1, 2, 3]);
      const result = mapReplacer('', set);
      expect(result).toEqual([1, 2, 3]);
    });
  });
});
