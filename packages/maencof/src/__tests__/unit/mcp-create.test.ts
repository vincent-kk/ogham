/**
 * @file mcp-create.test.ts
 * @description handleMaencofCreate 유닛 테스트
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofCreate } from '../../mcp/tools/maencof-create.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-test-'));
}

async function removeTempVault(vaultPath: string): Promise<void> {
  await rm(vaultPath, { recursive: true, force: true });
}

// ─── handleMaencofCreate ──────────────────────────────────────────────────────

describe('handleMaencofCreate', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  it('Layer 2 문서를 02_Derived 디렉토리에 생성한다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 2,
      tags: ['test', 'vitest'],
      content: '테스트 내용입니다.',
      title: 'Test Note',
    });

    expect(result.success).toBe(true);
    expect(result.path).toMatch(/^02_Derived\//);
    expect(result.path).toMatch(/\.md$/);
  });

  it('Layer 1 문서를 01_Core 디렉토리에 생성한다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 1,
      tags: ['identity'],
      content: '핵심 정체성 문서.',
      title: 'Core Identity',
    });

    expect(result.success).toBe(true);
    expect(result.path).toMatch(/^01_Core\//);
  });

  it('title이 없으면 tags[0]에서 파일명을 생성한다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 3,
      tags: ['external-source'],
      content: '외부 자료.',
    });

    expect(result.success).toBe(true);
    expect(result.path).toContain('external-source');
  });

  it('커스텀 filename 힌트를 사용한다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 2,
      tags: ['test'],
      content: '내용.',
      filename: 'my-custom-file',
    });

    expect(result.success).toBe(true);
    expect(result.path).toContain('my-custom-file');
  });

  it('생성된 파일에 Frontmatter가 포함된다', async () => {
    await handleMaencofCreate(vault, {
      layer: 2,
      tags: ['alpha', 'beta'],
      content: '본문 내용.',
      title: 'FM Test',
    });

    const files = await import('node:fs/promises').then((m) =>
      m.readdir(join(vault, '02_Derived')),
    );
    expect(files.length).toBeGreaterThan(0);

    const content = await readFile(
      join(vault, '02_Derived', files[0]),
      'utf-8',
    );
    expect(content).toContain('---');
    expect(content).toContain('tags:');
    expect(content).toContain('layer: 2');
    expect(content).toContain('created:');
    expect(content).toContain('updated:');
  });

  it('동일 경로에 파일이 존재하면 실패를 반환한다', async () => {
    const input = {
      layer: 2 as const,
      tags: ['dup'],
      content: '첫 번째.',
      filename: 'duplicate',
    };

    const first = await handleMaencofCreate(vault, input);
    expect(first.success).toBe(true);

    const second = await handleMaencofCreate(vault, input);
    expect(second.success).toBe(false);
    expect(second.message).toContain('File already exists');
  });

  it('stale-nodes.json에 새 경로가 추가된다', async () => {
    await handleMaencofCreate(vault, {
      layer: 2,
      tags: ['stale-test'],
      content: '내용.',
      title: 'Stale Test',
    });

    const raw = await readFile(
      join(vault, '.maencof/stale-nodes.json'),
      'utf-8',
    );
    const data = JSON.parse(raw) as { paths: string[] };
    expect(data.paths.some((p) => p.startsWith('02_Derived/'))).toBe(true);
  });

  it('source와 expires 옵션 필드가 Frontmatter에 포함된다', async () => {
    await handleMaencofCreate(vault, {
      layer: 3,
      tags: ['ext'],
      content: '외부 자료.',
      title: 'External',
      source: 'https://example.com',
      expires: '2025-12-31',
    });

    const files = await import('node:fs/promises').then((m) =>
      m.readdir(join(vault, '03_External')),
    );
    const content = await readFile(
      join(vault, '03_External', files[0]),
      'utf-8',
    );
    expect(content).toContain('source: https://example.com');
    expect(content).toContain('expires: 2025-12-31');
  });
});
