/**
 * @file l1-update-guard.test.ts
 * @description L1 Core Identity procedural mutability 유닛 테스트
 *
 * 테스트 대상:
 * - L1 3중 게이트 (change_reason + justification + confirm_l1)
 * - Audit log (JSONL) 기록
 * - KG warnings
 * - L1ChangeReason 검증 강도 매핑
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofUpdate } from '../../mcp/tools/maencof-update/maencof-update.js';
import {
  type L1AmendmentRecord,
  L1_VERIFICATION_INTENSITY,
} from '../../types/l1-amendment.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'maencof-l1-test-'));
}

async function removeTempVault(vaultPath: string): Promise<void> {
  await rm(vaultPath, { recursive: true, force: true });
}

async function createTestFile(
  vault: string,
  relativePath: string,
  layer: number = 2,
  tags: string[] = ['test'],
): Promise<void> {
  const absPath = join(vault, relativePath);
  const dir = relativePath.includes('/')
    ? relativePath.split('/').slice(0, -1).join('/')
    : '';
  if (dir) await mkdir(join(vault, dir), { recursive: true });
  const content = [
    '---',
    `created: 2024-01-01`,
    `updated: 2024-01-01`,
    `tags: [${tags.join(', ')}]`,
    `layer: ${layer}`,
    '---',
    '',
    'Test document content.',
  ].join('\n');
  await writeFile(absPath, content, 'utf-8');
}

const VALID_JUSTIFICATION =
  'Career transition led to a fundamental change in core values and priorities.';

// ─── L1 3중 게이트 ───────────────────────────────────────────────────────────

describe('handleMaencofUpdate — L1 Guard', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
    await createTestFile(vault, '01_Core/values.md', 1, ['identity', 'values']);
    await createTestFile(vault, '02_Derived/notes.md', 2);
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  it('L1 문서 + change_reason 누락 시 에러를 반환한다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      content: 'Updated content',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('change_reason');
    expect(result.message).toContain('identity_evolution');
  });

  it('L1 문서 + justification 누락 시 에러를 반환한다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      content: 'Updated content',
      change_reason: 'error_correction',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('justification');
  });

  it('L1 문서 + justification 20자 미만 시 에러를 반환한다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      content: 'Updated content',
      change_reason: 'error_correction',
      justification: 'Too short',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('justification');
  });

  it('L1 문서 + confirm_l1 누락 시 에러를 반환한다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      content: 'Updated content',
      change_reason: 'error_correction',
      justification: VALID_JUSTIFICATION,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('confirm_l1');
  });

  it('L1 문서 + layer 필드 변경 시 에러를 반환한다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      frontmatter: { layer: 2 },
      change_reason: 'info_update',
      justification: VALID_JUSTIFICATION,
      confirm_l1: true,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('layer');
  });

  it('L1 문서 + 3중 게이트 통과 시 수정에 성공한다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      content: 'Updated identity content',
      change_reason: 'identity_evolution',
      justification: VALID_JUSTIFICATION,
      confirm_l1: true,
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('Layer 1');

    // 파일 내용 확인
    const updated = await readFile(join(vault, '01_Core/values.md'), 'utf-8');
    expect(updated).toContain('Updated identity content');
  });

  it('L2 문서는 change_reason/justification/confirm_l1 없이 수정 가능하다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '02_Derived/notes.md',
      content: 'Updated L2 content',
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('Document updated');
  });
});

// ─── Audit Log ───────────────────────────────────────────────────────────────

describe('handleMaencofUpdate — L1 Audit Log', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
    await createTestFile(vault, '01_Core/values.md', 1);
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  it('L1 수정 성공 시 audit log JSONL이 생성된다', async () => {
    await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      content: 'New content',
      change_reason: 'error_correction',
      justification: VALID_JUSTIFICATION,
      confirm_l1: true,
    });

    const auditPath = join(
      vault,
      '02_Derived',
      'changelog',
      'l1-audit',
      'l1-amendments.jsonl',
    );
    const raw = await readFile(auditPath, 'utf-8');
    const record: L1AmendmentRecord = JSON.parse(raw.trim());

    expect(record.path).toBe('01_Core/values.md');
    expect(record.change_reason).toBe('error_correction');
    expect(record.justification).toBe(VALID_JUSTIFICATION);
    expect(record.snapshot_before).toBeDefined();
    expect(record.snapshot_before.length).toBeGreaterThan(0);
    expect(record.change_type).toBe('content');
  });

  it('여러 번 수정 시 audit log가 누적된다', async () => {
    for (let i = 0; i < 3; i++) {
      await handleMaencofUpdate(vault, {
        path: '01_Core/values.md',
        content: `Content version ${i}`,
        change_reason: 'info_update',
        justification: VALID_JUSTIFICATION,
        confirm_l1: true,
      });
    }

    const auditPath = join(
      vault,
      '02_Derived',
      'changelog',
      'l1-audit',
      'l1-amendments.jsonl',
    );
    const lines = (await readFile(auditPath, 'utf-8')).trim().split('\n');
    expect(lines).toHaveLength(3);

    const records = lines.map((l) => JSON.parse(l) as L1AmendmentRecord);
    expect(records[0].change_reason).toBe('info_update');
    expect(records[2].snapshot_before).toContain('Content version 1');
  });

  it('audit log에 affected_areas가 포함된다', async () => {
    await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      frontmatter: { tags: ['new-tag'] },
      change_reason: 'consolidation',
      justification: VALID_JUSTIFICATION,
      confirm_l1: true,
    });

    const auditPath = join(
      vault,
      '02_Derived',
      'changelog',
      'l1-audit',
      'l1-amendments.jsonl',
    );
    const record: L1AmendmentRecord = JSON.parse(
      (await readFile(auditPath, 'utf-8')).trim(),
    );
    expect(record.affected_areas).toBeDefined();
    expect(record.affected_areas!.length).toBeGreaterThan(0);
    expect(record.change_type).toBe('frontmatter');
  });
});

// ─── KG Warnings ─────────────────────────────────────────────────────────────

describe('handleMaencofUpdate — L1 KG Warnings', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
    await createTestFile(vault, '01_Core/values.md', 1);
  });

  afterEach(async () => {
    await removeTempVault(vault);
  });

  it('tags 변경 시 DOMAIN edge 경고가 포함된다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      frontmatter: { tags: ['new-domain'] },
      change_reason: 'identity_evolution',
      justification: VALID_JUSTIFICATION,
      confirm_l1: true,
    });
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('DOMAIN'))).toBe(true);
  });

  it('title 변경 시 참조 영향 경고가 포함된다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      frontmatter: { title: 'New Title' },
      change_reason: 'info_update',
      justification: VALID_JUSTIFICATION,
      confirm_l1: true,
    });
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('Title changed'))).toBe(
      true,
    );
  });

  it('content 변경 시 SA 가중치 경고가 포함된다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      content: 'Completely new content',
      change_reason: 'reinterpretation',
      justification: VALID_JUSTIFICATION,
      confirm_l1: true,
    });
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('SA activation'))).toBe(
      true,
    );
  });

  it('모든 L1 수정에 캐시 무효화 경고가 포함된다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '01_Core/values.md',
      content: 'Some change',
      change_reason: 'error_correction',
      justification: VALID_JUSTIFICATION,
      confirm_l1: true,
    });
    expect(result.warnings).toBeDefined();
    expect(
      result.warnings!.some((w) => w.includes('Graph cache invalidated')),
    ).toBe(true);
  });
});

// ─── L1ChangeReason 검증 강도 ────────────────────────────────────────────────

describe('L1_VERIFICATION_INTENSITY', () => {
  it('error_correction은 LOW이다', () => {
    expect(L1_VERIFICATION_INTENSITY.error_correction).toBe('LOW');
  });

  it('info_update는 LOW이다', () => {
    expect(L1_VERIFICATION_INTENSITY.info_update).toBe('LOW');
  });

  it('consolidation은 MEDIUM이다', () => {
    expect(L1_VERIFICATION_INTENSITY.consolidation).toBe('MEDIUM');
  });

  it('identity_evolution은 HIGH이다', () => {
    expect(L1_VERIFICATION_INTENSITY.identity_evolution).toBe('HIGH');
  });

  it('reinterpretation은 HIGH이다', () => {
    expect(L1_VERIFICATION_INTENSITY.reinterpretation).toBe('HIGH');
  });
});
