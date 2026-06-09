/**
 * @file maencofCreateFilename.test.ts
 * @description handleMaencofCreate 파일명 경로 — Bug A 중첩 방지 + 명시적 subdir 유지 + 깊이 방어선.
 */
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofCreate } from '../../../mcp/tools/maencofCreate/maencofCreate.js';

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-create-filename-'));
}

describe('handleMaencofCreate — filename path resolution', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('Bug A: 제목의 "/"가 디렉토리를 만들지 않고 flat 파일로 생성된다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 4,
      tags: ['t'],
      content: 'body',
      title: 'P/E 비교',
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('04_Action/p-e-비교.md');
    // 중첩 디렉토리(04_Action/p-e)가 생기지 않아야 함
    await expect(access(join(vault, '04_Action/p-e'))).rejects.toThrow();
  });

  it('Bug A: 슬래시가 섞인 긴 제목도 단일 basename으로 평탄화된다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 4,
      tags: ['t'],
      content: 'body',
      title: 'Apple 실사 — 매출/아이폰 단일출처 = AI 기대베팅',
    });

    expect(result.success).toBe(true);
    expect(result.path.startsWith('04_Action/')).toBe(true);
    const basename = result.path.slice('04_Action/'.length);
    expect(basename.includes('/')).toBe(false);
  });

  it('명시적 filename의 의도적 subdir은 유지된다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 4,
      tags: ['t'],
      content: 'body',
      filename: 'cve/CVE-2025-1234',
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('04_Action/cve/cve-2025-1234.md');
  });

  it('명시적 filename의 subdir 깊이 초과는 거부된다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 4,
      tags: ['t'],
      content: 'body',
      filename: 'a/b/c/deep',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('subdirectory depth');
  });

  it('명시적 filename의 ".." traversal 세그먼트는 거부된다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 4,
      tags: ['t'],
      content: 'body',
      filename: '../secret',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Path traversal');
  });

  it('".."가 traversal이 아닌 일반 파일명은 허용된다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 4,
      tags: ['t'],
      content: 'body',
      filename: 'Q1..Q2',
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('04_Action/q1q2.md');
  });
});
