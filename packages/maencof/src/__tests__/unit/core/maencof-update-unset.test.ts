/**
 * @file maencof-update-unset.spec.ts
 * @description handleMaencofUpdate frontmatter.unset 회복 경로.
 *
 * 3+12 룰: ≤15 케이스. 보호 필드 거부 + 허용 필드 unset 라운드트립 + L1 차단 + 결합.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofUpdate } from '../../../mcp/tools/maencof-update/maencof-update.js';
import { handleMaencofRead } from '../../../mcp/tools/maencof-read/maencof-read.js';

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-update-unset-'));
}

async function writeFm(
  vault: string,
  rel: string,
  fmLines: string[],
  body = 'Body.',
): Promise<void> {
  const abs = join(vault, rel);
  await mkdir(join(vault, rel.split('/').slice(0, -1).join('/')), {
    recursive: true,
  });
  const content = ['---', ...fmLines, '---', '', body].join('\n');
  await writeFile(abs, content, 'utf-8');
}

const TODAY = new Date().toISOString().slice(0, 10);

describe('handleMaencofUpdate — frontmatter.unset', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  // ─── 보호 필드 거부 (4) ────────────────────────────────────────────────
  it.each(['created', 'updated', 'layer', 'tags'])(
    '보호 필드 unset 거부: %s',
    async (key) => {
      await writeFm(vault, '03_External/topical/x.md', [
        'created: 2026-01-01',
        'updated: 2026-01-01',
        'tags: [t]',
        'layer: 3',
        'sub_layer: topical',
      ]);
      const result = await handleMaencofUpdate(vault, {
        path: '03_External/topical/x.md',
        frontmatter: { unset: [key] },
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot unset protected frontmatter fields');
      expect(result.message).toContain(key);
    },
  );

  // ─── 허용 필드 unset 라운드트립 (4) ────────────────────────────────────
  it('sub_layer unset 시 read 라운드트립 통과 (L3 + sub_layer 제거)', async () => {
    await writeFm(vault, '03_External/topical/x.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [t]',
      'layer: 3',
      'sub_layer: topical',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '03_External/topical/x.md',
      frontmatter: { unset: ['sub_layer'] },
    });
    expect(result.success).toBe(true);
    const readBack = await handleMaencofRead(vault, {
      path: '03_External/topical/x.md',
    });
    expect(readBack.success).toBe(true);
    const raw = await readFile(join(vault, '03_External/topical/x.md'), 'utf-8');
    expect(raw).not.toMatch(/^sub_layer:/m);
    expect(raw).toContain(`updated: ${TODAY}`);
  });

  it('title unset 통과', async () => {
    await writeFm(vault, '02_Derived/y.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [t]',
      'layer: 2',
      'title: "Old"',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '02_Derived/y.md',
      frontmatter: { unset: ['title'] },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '02_Derived/y.md'), 'utf-8');
    expect(raw).not.toMatch(/^title:/m);
  });

  it('source unset 통과', async () => {
    await writeFm(vault, '03_External/topical/z.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [t]',
      'layer: 3',
      'sub_layer: topical',
      'source: "https://example.com"',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '03_External/topical/z.md',
      frontmatter: { unset: ['source'] },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '03_External/topical/z.md'), 'utf-8');
    expect(raw).not.toMatch(/^source:/m);
  });

  it('존재하지 않는 필드 unset은 no-op 통과', async () => {
    await writeFm(vault, '02_Derived/n.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [t]',
      'layer: 2',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '02_Derived/n.md',
      frontmatter: { unset: ['source', 'expires'] },
    });
    expect(result.success).toBe(true);
  });

  // ─── 결합 시나리오 (3) ─────────────────────────────────────────────────
  it('다중 unset 한 호출: [sub_layer, title]', async () => {
    await writeFm(vault, '03_External/topical/m.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [t]',
      'layer: 3',
      'sub_layer: topical',
      'title: "Old"',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '03_External/topical/m.md',
      frontmatter: { unset: ['sub_layer', 'title'] },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '03_External/topical/m.md'), 'utf-8');
    expect(raw).not.toMatch(/^sub_layer:/m);
    expect(raw).not.toMatch(/^title:/m);
  });

  it('unset + 동시 머지: sub_layer 제거 + title 새로 설정', async () => {
    await writeFm(vault, '03_External/topical/c.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [t]',
      'layer: 3',
      'sub_layer: topical',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '03_External/topical/c.md',
      frontmatter: { unset: ['sub_layer'], title: 'New Title' },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '03_External/topical/c.md'), 'utf-8');
    expect(raw).not.toMatch(/^sub_layer:/m);
    expect(raw).toMatch(/^title: New Title$/m);
  });

  it('보호 필드 + 허용 필드 혼합 unset은 보호 필드 때문에 전체 거부', async () => {
    await writeFm(vault, '03_External/topical/mix.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [t]',
      'layer: 3',
      'sub_layer: topical',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '03_External/topical/mix.md',
      frontmatter: { unset: ['sub_layer', 'layer'] },
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('layer');
    // 보호 거부로 파일 변경되지 않았는지 확인
    const raw = await readFile(
      join(vault, '03_External/topical/mix.md'),
      'utf-8',
    );
    expect(raw).toMatch(/^sub_layer: topical$/m);
  });

  // ─── L1 차단 (1) ───────────────────────────────────────────────────────
  it('L1 문서는 unset 자체 차단', async () => {
    await writeFm(vault, '01_Core/identity.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [identity]',
      'layer: 1',
      'title: "core"',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/identity.md',
      change_reason: 'identity_evolution',
      justification:
        'A justification long enough to pass the 20-char gate for L1 amendment.',
      confirm_l1: true,
      frontmatter: { unset: ['title'] },
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Layer 1 documents do not allow frontmatter.unset');
  });
});
