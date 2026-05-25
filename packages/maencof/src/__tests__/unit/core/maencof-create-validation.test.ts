/**
 * @file maencof-create-validation.test.ts
 * @description handleMaencofCreate write-path 게이트 라운드트립.
 */
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofCreate } from '../../../mcp/tools/maencof-create/maencof-create.js';
import { handleMaencofRead } from '../../../mcp/tools/maencof-read/maencof-read.js';

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-create-validation-'));
}

describe('handleMaencofCreate — frontmatter validation gate', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('잘못된 (layer, sub_layer) 조합은 거부 + 파일 미생성', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 4,
      sub_layer: 'topical',
      tags: ['t'],
      content: 'x',
      title: 'corrupt',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Frontmatter validation failed');
    expect(result.message).toContain(
      'sub_layer is only valid for Layer 3 or 5',
    );

    // 파일이 디스크에 쓰이지 않았는지 확인 (04_Action 디렉토리 자체가 없어야 함)
    await expect(access(join(vault, '04_Action'))).rejects.toThrow();
  });

  it('적법한 입력은 파일 생성 + read 라운드트립 통과', async () => {
    const created = await handleMaencofCreate(vault, {
      layer: 3,
      sub_layer: 'topical',
      tags: ['ts'],
      content: '# Hello\n\nbody',
      title: 'hello',
    });
    expect(created.success).toBe(true);
    expect(created.path).toMatch(/^03_External\/topical\//);

    const readResult = await handleMaencofRead(vault, { path: created.path });
    expect(readResult.success).toBe(true);
    expect(readResult.node.layer).toBe(3);
    expect(readResult.node.subLayer).toBe('topical');
  });

  it('보호 필드 위반: L1 + sub_layer 거부', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: 1,
      sub_layer: 'relational',
      tags: ['t'],
      content: 'x',
      title: 'l1-bad',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain(
      'sub_layer is only valid for Layer 3 or 5',
    );
  });
});
