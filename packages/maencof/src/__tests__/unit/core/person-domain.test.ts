/**
 * @file person-domain.test.ts
 * @description Frontmatter person/domain 필드 파싱 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import { parseDocument } from '../../../core/document-parser.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function makeDoc(
  frontmatter: string,
  body = '# Title\n\nContent here.',
): string {
  return `---\n${frontmatter}\n---\n${body}`;
}

const VALID_FM = `created: 2026-02-28
updated: 2026-02-28
tags: [core, identity]
layer: 1`;

// ─── Frontmatter person/domain 필드 파싱 ──────────────────────────────────────

describe('Frontmatter person/domain 필드 파싱', () => {
  it('person/domain 필드 없는 기존 frontmatter가 파싱 성공한다', () => {
    const content = makeDoc(VALID_FM);
    const doc = parseDocument('01_Core/identity.md', content, 1000);
    expect(doc.frontmatter.success).toBe(true);
  });

  it('domain 필드 포함 frontmatter가 파싱 성공한다', () => {
    const fm = `created: 2026-02-28
updated: 2026-02-28
tags: [ai]
layer: 2
domain: AI 연구
domain_type: professional`;
    const content = makeDoc(fm);
    const doc = parseDocument('02_Derived/ai-notes.md', content, 1000);
    expect(doc.frontmatter.success).toBe(true);
    expect(doc.frontmatter.data?.domain).toBe('AI 연구');
    expect(doc.frontmatter.data?.domain_type).toBe('professional');
  });

  it('domain_type 유효하지 않으면 파싱이 실패한다', () => {
    const fm = `created: 2026-02-28
updated: 2026-02-28
tags: [ai]
layer: 2
domain: 테스트
domain_type: invalid_type`;
    const content = makeDoc(fm);
    const doc = parseDocument('02_Derived/ai-notes.md', content, 1000);
    expect(doc.frontmatter.success).toBe(false);
  });

  it('layer 5인 frontmatter가 파싱 성공한다', () => {
    const fm = `created: 2026-02-28
updated: 2026-02-28
tags: [context]
layer: 5`;
    const content = makeDoc(fm);
    const doc = parseDocument('05_Context/env.md', content, 1000);
    expect(doc.frontmatter.success).toBe(true);
    expect(doc.frontmatter.data?.layer).toBe(5);
  });
});
