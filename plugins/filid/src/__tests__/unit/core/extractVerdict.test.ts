/**
 * @file extractVerdict.test.ts
 * @description review-report.md / re-validate.md verdict 추출기 검증.
 * 실제 사고 사례: `**Verdict**: **APPROVED (with notes)**` (굵게 감싼 표기)가
 * body-only 정규식과 매칭되지 않아 PR 코멘트 헤더에 UNKNOWN 이 게시됨.
 */
import { describe, expect, it } from 'vitest';

import {
  extractRevalidateVerdict,
  extractVerdict,
} from '../../../core/prSummary/prSummary.js';
import { extractVerdict as reviewManageExtractVerdict } from '../../../mcp/tools/reviewManage/utils/reviewUtils.js';

describe('extractVerdict', () => {
  it('reads the frontmatter verdict as the source of truth', () => {
    const content = `---\nverdict: REQUEST_CHANGES\nbranch: x\n---\n\n**Verdict**: APPROVED\n`;
    expect(extractVerdict(content)).toBe('REQUEST_CHANGES');
  });

  it('tolerates bold-wrapped body verdicts (the shipped-UNKNOWN regression)', () => {
    const content = `# Report\n\n**Verdict**: **APPROVED (with notes)**\n`;
    expect(extractVerdict(content)).toBe('APPROVED');
  });

  it('still reads the plain body line', () => {
    expect(extractVerdict('**Verdict**: INCONCLUSIVE')).toBe('INCONCLUSIVE');
  });

  it('returns UNKNOWN when nothing matches', () => {
    expect(extractVerdict('no verdict anywhere')).toBe('UNKNOWN');
  });

  it('is the same single implementation reviewManage re-exports', () => {
    expect(reviewManageExtractVerdict).toBe(extractVerdict);
  });
});

describe('extractRevalidateVerdict', () => {
  it('reads the frontmatter verdict first', () => {
    const content = `---\nverdict: FAIL\n---\n\n# Revalidation — PASS\n`;
    expect(extractRevalidateVerdict(content)).toBe('FAIL');
  });

  it('reads the em-dash header form', () => {
    expect(extractRevalidateVerdict('# Revalidation — PASS')).toBe('PASS');
  });

  it('tolerates bold-wrapped verdict lines', () => {
    expect(extractRevalidateVerdict('**Verdict**: **FAIL**')).toBe('FAIL');
    expect(extractRevalidateVerdict('**Final Verdict**: **PASS**')).toBe(
      'PASS',
    );
  });

  it('returns UNKNOWN when nothing matches', () => {
    expect(extractRevalidateVerdict('nothing here')).toBe('UNKNOWN');
  });
});
