/**
 * @file updateMetadataFields.test.ts
 * @description handleMaencofUpdate 확장 metadata 필드 패치 표면.
 *
 * 15케이스 캡: 인용 문자열 5(each) + enum 3(each) + 결합·배열·날짜 5 + 거부·승격 2.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofRead } from '../../../mcp/tools/maencofRead/maencofRead.js';
import { handleMaencofUpdate } from '../../../mcp/tools/maencofUpdate/maencofUpdate.js';
import type { MaencofUpdateFrontmatter } from '../../../types/mcpCrud.js';

/**
 * metadata update 테스트마다 사용할 격리 vault를 만든다.
 *
 * @returns 새 임시 vault의 절대 경로.
 */
async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-update-metadata-'));
}

/**
 * 테스트 문서를 지정한 frontmatter와 본문으로 쓴다.
 *
 * @param vault - 임시 vault의 절대 경로.
 * @param rel - vault 기준 문서 상대 경로.
 * @param fmLines - YAML 구분자 사이에 넣을 frontmatter 줄.
 * @param body - frontmatter 뒤에 쓸 본문.
 * @returns 문서 쓰기가 끝나면 이행되는 Promise.
 */
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

/** Layer 2 테스트 문서의 최소 유효 frontmatter 줄. */
const BASE_L2 = [
  'created: 2026-01-01',
  'updated: 2026-01-01',
  'tags: [t]',
  'layer: 2',
];
/** Layer 4 테스트 문서의 최소 유효 frontmatter 줄. */
const BASE_L4 = [
  'created: 2026-01-01',
  'updated: 2026-01-01',
  'tags: [t]',
  'layer: 4',
];
/** Layer 5 테스트 문서의 최소 유효 frontmatter 줄. */
const BASE_L5 = [
  'created: 2026-01-01',
  'updated: 2026-01-01',
  'tags: [t]',
  'layer: 5',
];
/**
 * 지정한 Layer 3 하위 유형의 최소 유효 frontmatter를 만든다.
 *
 * @param sub - 테스트할 Layer 3 sub-layer 값.
 * @returns 해당 sub-layer를 포함한 frontmatter 줄.
 */
const baseL3 = (sub: string): string[] => [
  'created: 2026-01-01',
  'updated: 2026-01-01',
  'tags: [t]',
  'layer: 3',
  `sub_layer: ${sub}`,
];

describe('handleMaencofUpdate — 확장 metadata 필드', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  // ─── 인용 문자열 필드 (5) ─────────────────────────────────────────────
  it.each([
    ['source', '03_External/topical/s.md', baseL3('topical')],
    ['ba_context', '03_External/structural/b.md', baseL3('structural')],
    ['topic_category', '03_External/topical/tc.md', baseL3('topical')],
    ['person_ref', '03_External/relational/p.md', baseL3('relational')],
    ['source_context', '05_Context/sc.md', BASE_L5],
  ] as const)(
    '인용 필요 문자열 패치·라운드트립: %s',
    async (field, rel, fm) => {
      await writeFm(vault, rel, [...fm]);
      const result = await handleMaencofUpdate(vault, {
        path: rel,
        frontmatter: { [field]: 'val: needs quoting' },
      });
      expect(result.success).toBe(true);
      const raw = await readFile(join(vault, rel), 'utf-8');
      expect(raw).toMatch(new RegExp(`^${field}: "val: needs quoting"$`, 'm'));
      const readBack = await handleMaencofRead(vault, { path: rel });
      expect(readBack.success).toBe(true);
    },
  );

  // ─── enum 필드 (3) ────────────────────────────────────────────────────
  it.each([
    [
      'org_type',
      'community',
      '03_External/structural/o.md',
      baseL3('structural'),
    ],
    [
      'membership_status',
      'alumni',
      '03_External/structural/m.md',
      baseL3('structural'),
    ],
    ['maturity', 'evergreen', '03_External/topical/ma.md', baseL3('topical')],
  ] as const)('enum 필드 비인용 패치: %s', async (field, value, rel, fm) => {
    await writeFm(vault, rel, [...fm]);
    const result = await handleMaencofUpdate(vault, {
      path: rel,
      frontmatter: { [field]: value },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, rel), 'utf-8');
    expect(raw).toMatch(new RegExp(`^${field}: ${value}$`, 'm'));
  });

  // ─── 결합·배열·날짜 (5) ───────────────────────────────────────────────
  it('domain + domain_type 한 호출 (L2)', async () => {
    await writeFm(vault, '02_Derived/d.md', BASE_L2);
    const result = await handleMaencofUpdate(vault, {
      path: '02_Derived/d.md',
      frontmatter: { domain: 'work', domain_type: 'professional' },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '02_Derived/d.md'), 'utf-8');
    expect(raw).toMatch(/^domain: work$/m);
    expect(raw).toMatch(/^domain_type: professional$/m);
  });

  it('mentioned_persons 배열 인라인 패치 (L2)', async () => {
    await writeFm(vault, '02_Derived/mp.md', BASE_L2);
    const result = await handleMaencofUpdate(vault, {
      path: '02_Derived/mp.md',
      frontmatter: { mentioned_persons: ['홍길동', 'Alice'] },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '02_Derived/mp.md'), 'utf-8');
    expect(raw).toMatch(/^mentioned_persons: \[홍길동, Alice\]$/m);
    const readBack = await handleMaencofRead(vault, {
      path: '02_Derived/mp.md',
    });
    expect(readBack.success).toBe(true);
  });

  it('trust_level + expertise_domains 한 호출 (L3A)', async () => {
    await writeFm(vault, '03_External/relational/t.md', baseL3('relational'));
    const result = await handleMaencofUpdate(vault, {
      path: '03_External/relational/t.md',
      frontmatter: {
        trust_level: 0.85,
        expertise_domains: ['security', 'devops'],
      },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(
      join(vault, '03_External/relational/t.md'),
      'utf-8',
    );
    expect(raw).toMatch(/^trust_level: 0.85$/m);
    expect(raw).toMatch(/^expertise_domains: \[security, devops\]$/m);
  });

  it('expires 날짜 비인용 패치 (L4)', async () => {
    await writeFm(vault, '04_Action/e.md', BASE_L4);
    const result = await handleMaencofUpdate(vault, {
      path: '04_Action/e.md',
      frontmatter: { expires: '2026-12-31' },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '04_Action/e.md'), 'utf-8');
    expect(raw).toMatch(/^expires: 2026-12-31$/m);
  });

  it('L5 버퍼 3필드 한 호출 (L5)', async () => {
    await writeFm(vault, '05_Context/buf.md', BASE_L5);
    const result = await handleMaencofUpdate(vault, {
      path: '05_Context/buf.md',
      frontmatter: {
        buffer_type: 'snippet',
        promotion_target: 'relational',
        source_context: 'clipping',
      },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '05_Context/buf.md'), 'utf-8');
    expect(raw).toMatch(/^buffer_type: snippet$/m);
    expect(raw).toMatch(/^promotion_target: relational$/m);
    expect(raw).toMatch(/^source_context: clipping$/m);
  });

  // ─── 검증 게이트 경유 거부·승격 (2) ──────────────────────────────────
  it('레이어 전용 필드는 잘못된 레이어·서브레이어에서 거부되고 파일은 불변', async () => {
    await writeFm(vault, '02_Derived/no5.md', BASE_L2);
    const before = await readFile(join(vault, '02_Derived/no5.md'), 'utf-8');
    const result = await handleMaencofUpdate(vault, {
      path: '02_Derived/no5.md',
      frontmatter: { buffer_type: 'snippet' },
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('exclusive to Layer 5');
    const after = await readFile(join(vault, '02_Derived/no5.md'), 'utf-8');
    expect(after).toBe(before);

    const l3OnlyUpdates: Array<{
      field: string;
      frontmatter: MaencofUpdateFrontmatter;
      wrongSubLayer: 'relational' | 'structural' | 'topical';
    }> = [
      {
        field: 'person_ref',
        frontmatter: { person_ref: 'alice' },
        wrongSubLayer: 'structural',
      },
      {
        field: 'trust_level',
        frontmatter: { trust_level: 0.8 },
        wrongSubLayer: 'structural',
      },
      {
        field: 'expertise_domains',
        frontmatter: { expertise_domains: ['typescript'] },
        wrongSubLayer: 'structural',
      },
      {
        field: 'org_type',
        frontmatter: { org_type: 'company' },
        wrongSubLayer: 'topical',
      },
      {
        field: 'membership_status',
        frontmatter: { membership_status: 'active' },
        wrongSubLayer: 'topical',
      },
      {
        field: 'ba_context',
        frontmatter: { ba_context: 'engineering team' },
        wrongSubLayer: 'topical',
      },
      {
        field: 'topic_category',
        frontmatter: { topic_category: 'distributed systems' },
        wrongSubLayer: 'relational',
      },
      {
        field: 'maturity',
        frontmatter: { maturity: 'growing' },
        wrongSubLayer: 'relational',
      },
    ];

    for (const { field, frontmatter, wrongSubLayer } of l3OnlyUpdates) {
      const l2Path = '02_Derived/no-l3.md';
      await writeFm(vault, l2Path, BASE_L2);
      const l2Before = await readFile(join(vault, l2Path), 'utf-8');
      const l2Result = await handleMaencofUpdate(vault, {
        path: l2Path,
        frontmatter,
      });
      expect(l2Result.success).toBe(false);
      expect(l2Result.message).toContain(`${field} is exclusive`);
      expect(await readFile(join(vault, l2Path), 'utf-8')).toBe(l2Before);

      const wrongSubLayerPath = '03_External/wrong-sub-layer.md';
      await writeFm(vault, wrongSubLayerPath, baseL3(wrongSubLayer));
      const wrongSubLayerBefore = await readFile(
        join(vault, wrongSubLayerPath),
        'utf-8',
      );
      const wrongSubLayerResult = await handleMaencofUpdate(vault, {
        path: wrongSubLayerPath,
        frontmatter,
      });
      expect(wrongSubLayerResult.success).toBe(false);
      expect(wrongSubLayerResult.message).toContain(`${field} is exclusive`);
      expect(await readFile(join(vault, wrongSubLayerPath), 'utf-8')).toBe(
        wrongSubLayerBefore,
      );
    }
  });

  it('layer 승격 + L5 필드 unset 결합이 한 호출로 통과', async () => {
    await writeFm(vault, '05_Context/promote.md', [
      ...BASE_L5,
      'buffer_type: snippet',
      'promotion_target: L2',
    ]);
    const result = await handleMaencofUpdate(vault, {
      path: '05_Context/promote.md',
      frontmatter: {
        layer: 2,
        unset: ['buffer_type', 'promotion_target'],
      },
    });
    expect(result.success).toBe(true);
    const raw = await readFile(join(vault, '05_Context/promote.md'), 'utf-8');
    expect(raw).toMatch(/^layer: 2$/m);
    expect(raw).not.toMatch(/^buffer_type:/m);
    expect(raw).not.toMatch(/^promotion_target:/m);
  });
});
