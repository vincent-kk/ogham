/**
 * @file updateNoFrontmatter.test.ts
 * @description update 핸들러의 frontmatter-없는 파일 거부 가드 회귀 테스트.
 *   경로 봉쇄 후에도 vault 내부의 non-maencof(frontmatter 부재) 파일을
 *   무검증 덮어쓰지 않는지 검증한다. 정상 frontmatter 문서는 영향받지 않음도 확인.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofUpdate } from '../../mcp/tools/maencofUpdate/maencofUpdate.js';

describe('handleMaencofUpdate — frontmatter 없는 파일 거부', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-nofm-'));
    await mkdir(join(vault, '02_Derived'), { recursive: true });
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('frontmatter 블록이 없는 vault 내부 파일은 덮어쓰지 않는다', async () => {
    const raw = '# 그냥 마크다운\n\nfrontmatter 없는 non-maencof 파일.';
    await writeFile(join(vault, '02_Derived/plain.md'), raw, 'utf-8');

    const result = await handleMaencofUpdate(vault, {
      path: '02_Derived/plain.md',
      content: 'OVERWRITTEN',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('no frontmatter block');
    expect(await readFile(join(vault, '02_Derived/plain.md'), 'utf-8')).toBe(
      raw,
    );
  });

  it('정상 frontmatter 문서는 그대로 갱신된다', async () => {
    const doc = [
      '---',
      'created: 2024-01-01',
      'updated: 2024-01-01',
      'tags: [test]',
      'layer: 2',
      '---',
      '',
      '원본 본문.',
    ].join('\n');
    await writeFile(join(vault, '02_Derived/doc.md'), doc, 'utf-8');

    const result = await handleMaencofUpdate(vault, {
      path: '02_Derived/doc.md',
      content: '새 본문.',
    });

    expect(result.success).toBe(true);
    const written = await readFile(join(vault, '02_Derived/doc.md'), 'utf-8');
    expect(written).toContain('layer: 2');
    expect(written).toContain('새 본문.');
  });
});
